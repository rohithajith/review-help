const express = require('express');
const router = express.Router();
const { getAdminPool } = require('../tenantManager');

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

// =============================================================================
// Create Stripe Checkout Session (subscription mode)
// =============================================================================
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripeClient = getStripe();

    const { plan, email, businessId, success_url, cancel_url } = req.body || {};
    if (!plan) return res.status(400).json({ error: 'Missing plan in request' });

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
        businessId: businessId ? String(businessId) : '',
      },
      success_url: success_url || `${frontendUrl}/#/signup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${frontendUrl}/#/signup?canceled=true`,
    };

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
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripeClient = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // If no webhook secret, parse body directly (dev mode)
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  try {
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

  const plan = metadata?.plan;
  const businessId = metadata?.businessId;

  if (!businessId) {
    console.warn('checkout.session.completed: no businessId in metadata');
    return;
  }

  console.log(`Checkout completed for business ${businessId}, plan=${plan}, subscription=${subscription}`);

  // Update business with plan and Stripe IDs
  await pool.query(
    `UPDATE businesses SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3 WHERE id = $4`,
    [plan || 'Pro', customer || null, subscription || null, businessId]
  );

  console.log(`Business ${businessId} upgraded to plan: ${plan}`);
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
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const stripeClient = getStripe();
    const { sessionId } = req.params;

    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.payment_status,
      plan: session.metadata?.plan || null,
      businessId: session.metadata?.businessId || null,
      customerEmail: session.customer_email,
    });
  } catch (err) {
    console.error('verify-session error:', err.message);
    res.status(400).json({ error: 'Invalid session' });
  }
});

module.exports = router;
