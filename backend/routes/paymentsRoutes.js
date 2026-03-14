const express = require('express');
const router = express.Router();
const { getAdminPool } = require('../tenantManager');
const authMiddleware = require('../middleware/authMiddleware');

// Stripe instance (lazy-loaded)
let stripe = null;
function getStripe() {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');
    const Stripe = require('stripe');
    stripe = new Stripe(stripeKey);
  }
  return stripe;
}

// Plan configuration: map plan names to Stripe price details
const PLAN_CONFIG = {
  'Starter': null, // free trial
  'Pro': { currency: 'gbp', amount: 3900, interval: 'month' },
  'Pro Max': { currency: 'gbp', amount: 4900, interval: 'month' },
  'Enterprise': null, // custom / contact sales
};
const UPGRADABLE_PAID_PLANS = new Set(['Pro', 'Pro Max']);

function normalizeBusinessId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function isBusinessOwner(pool, businessId, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM business_owners WHERE business_id = $1 AND user_id = $2 LIMIT 1',
    [businessId, userId]
  );
  return rows.length > 0;
}

// =============================================================================
// Create Stripe Checkout Session (subscription mode)
// =============================================================================
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const stripeClient = getStripe();
    const pool = getAdminPool();

    const { plan, email, businessId } = req.body || {};
    if (!plan) return res.status(400).json({ error: 'Missing plan in request' });
    const normalizedBusinessId = normalizeBusinessId(businessId);
    if (!normalizedBusinessId) return res.status(400).json({ error: 'Missing or invalid businessId in request' });
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const owner = await isBusinessOwner(pool, normalizedBusinessId, userId);
    if (!owner) return res.status(403).json({ error: 'Forbidden: user does not own this business' });

    const mapping = PLAN_CONFIG[plan] || null;
    if (!mapping) return res.status(400).json({ error: 'Plan does not require checkout or is invalid' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';

    // Build subscription checkout session
    const sessionParams = {
      customer_email: email || undefined,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: mapping.currency,
            product_data: { name: `Review-Help ${plan} Plan` },
            unit_amount: mapping.amount,
            recurring: { interval: mapping.interval },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: {
        plan,
        businessId: String(normalizedBusinessId),
        userId: String(userId),
      },
      success_url: `${frontendUrl}/#/signup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/#/signup?canceled=true`,
    };

    const requesterEmail = req.user && req.user.email ? String(req.user.email).trim() : '';
    sessionParams.customer_email = requesterEmail || (email ? String(email).trim() : undefined);

    const session = await stripeClient.checkout.sessions.create(sessionParams);

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Payments.create-checkout-session error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// =============================================================================
// Stripe Webhook Handler
// =============================================================================
router.post('/webhook', async (req, res) => {
  const stripeClient = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      if (!sig) return res.status(400).send('Webhook Error: Missing stripe-signature header');
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is required in production');
        return res.status(500).send('Webhook Error: misconfigured webhook secret');
      }
      // Dev-only fallback when no webhook secret is configured
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString('utf8'));
      } else if (typeof req.body === 'string') {
        event = JSON.parse(req.body);
      } else {
        event = req.body;
      }
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  try {
    if (!event || typeof event.type !== 'string') {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        // Could send receipt email, etc.
        console.log('Invoice payment succeeded:', event.data.object.id);
        break;
      }
      case 'invoice.payment_failed': {
        console.warn('Invoice payment failed:', event.data.object.id);
        // Could downgrade plan or notify user
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (handlerErr) {
    console.error('Webhook handler error:', handlerErr);
  }

  res.json({ received: true });
});

/**
 * Handle checkout.session.completed: update business plan and store Stripe IDs
 */
async function handleCheckoutCompleted(session) {
  const pool = getAdminPool();
  const { metadata, customer, subscription } = session;

  const plan = String(metadata?.plan || '').trim();
  const businessId = metadata?.businessId;
  const userId = metadata?.userId;
  const normalizedBusinessId = normalizeBusinessId(businessId);
  const upgradedPlan = UPGRADABLE_PAID_PLANS.has(plan) ? plan : 'Pro';

  if (!normalizedBusinessId) {
    console.warn('checkout.session.completed: no businessId in metadata');
    return;
  }

  if (userId) {
    const owner = await isBusinessOwner(pool, normalizedBusinessId, userId);
    if (!owner) {
      console.warn(`checkout.session.completed: ownership check failed for business ${normalizedBusinessId} and user ${userId}`);
      return;
    }
  }

  console.log(`Checkout completed for business ${normalizedBusinessId}, plan=${upgradedPlan}, subscription=${subscription}`);

  // Update business with plan and Stripe IDs
  await pool.query(
    `UPDATE businesses SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3 WHERE id = $4`,
    [upgradedPlan, customer || null, subscription || null, normalizedBusinessId]
  );

  console.log(`Business ${normalizedBusinessId} upgraded to plan: ${upgradedPlan}`);
}

/**
 * Handle subscription changes (cancel, update)
 */
async function handleSubscriptionChange(subscription) {
  const pool = getAdminPool();
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Find business by stripe_subscription_id
  const { rows } = await pool.query(
    'SELECT id, plan FROM businesses WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (rows.length === 0) {
    console.warn(`Subscription ${subscriptionId} not linked to any business`);
    return;
  }

  const business = rows[0];

  if (status === 'canceled' || status === 'unpaid') {
    // Downgrade to Starter
    await pool.query('UPDATE businesses SET plan = $1 WHERE id = $2', ['Starter', business.id]);
    console.log(`Business ${business.id} downgraded to Starter (subscription ${status})`);
  } else if (status === 'active') {
    // Subscription reactivated or updated — plan might be in metadata
    // For simplicity, we leave the plan as-is; in production, read plan from Stripe product metadata
    console.log(`Subscription ${subscriptionId} status is active`);
  }
}

// =============================================================================
// Verify a Checkout Session (called by frontend after redirect)
// =============================================================================
router.get('/verify-session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const stripeClient = getStripe();
    const pool = getAdminPool();
    const { sessionId } = req.params;

    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    const businessId = normalizeBusinessId(session?.metadata?.businessId);
    const userId = req.userId;
    if (!businessId || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const owner = await isBusinessOwner(pool, businessId, userId);
    if (!owner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      status: session.payment_status,
      plan: session.metadata?.plan || null,
      businessId: String(businessId),
      customerEmail: session.customer_email,
    });
  } catch (err) {
    console.error('verify-session error:', err.message);
    res.status(400).json({ error: 'Invalid session' });
  }
});

module.exports = router;
