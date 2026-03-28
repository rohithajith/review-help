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

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const withoutTrailingSlash = value.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(withoutTrailingSlash)) return null;
  return withoutTrailingSlash;
}

function resolveFrontendUrl(req) {
  const configured = normalizeBaseUrl(process.env.FRONTEND_URL);
  if (configured) return configured;

  // Prefer request origin when available.
  const originHeader = normalizeBaseUrl(req?.headers?.origin);
  if (originHeader) return originHeader;

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req?.protocol || 'https';
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();

  if (host && !/^localhost(?::\d+)?$/i.test(host) && !/^127\.0\.0\.1(?::\d+)?$/i.test(host)) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  // Production-safe fallback for hosted deployment.
  return 'https://app.reviewhelp.uk';
}

// Plan configuration: all signup plans are paid subscriptions.
const PLAN_CONFIG = {
  Starter: { currency: 'gbp', amount: 2900, interval: 'month', trialPeriodDays: 7 },
  Pro: { currency: 'gbp', amount: 3900, interval: 'month' },
  'Pro Max': { currency: 'gbp', amount: 4900, interval: 'month' },
};
const BILLING_ACTIVE = 'active';
const BILLING_PENDING = 'pending';
const BILLING_PAST_DUE = 'past_due';
const BILLING_CANCELED = 'canceled';

function normalizeBusinessId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePlan(raw) {
  const plan = String(raw || '').trim();
  return PLAN_CONFIG[plan] ? plan : null;
}

async function isBusinessOwner(pool, businessId, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM business_owners WHERE business_id = $1 AND user_id = $2 LIMIT 1',
    [businessId, userId]
  );
  return rows.length > 0;
}

async function getOwnedBusiness(pool, businessId, userId) {
  const { rows } = await pool.query(
    `SELECT id, name, plan, billing_required, billing_status, pending_plan, trial_ends_at
     FROM businesses
     WHERE id = $1
       AND EXISTS (
         SELECT 1 FROM business_owners bo
         WHERE bo.business_id = businesses.id AND bo.user_id = $2
       )
     LIMIT 1`,
    [businessId, userId]
  );
  return rows[0] || null;
}

function toIsoOrNull(epochSeconds) {
  if (!epochSeconds || !Number.isFinite(Number(epochSeconds))) return null;
  const date = new Date(Number(epochSeconds) * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function createCheckoutSessionForBusiness({
  stripeClient,
  pool,
  req,
  businessId,
  userId,
  plan,
  email,
}) {
  const mapping = PLAN_CONFIG[plan];
  if (!mapping) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const frontendUrl = resolveFrontendUrl(req);
  const requesterEmail = req.user && req.user.email ? String(req.user.email).trim() : '';

  const sessionParams = {
    customer_email: requesterEmail || (email ? String(email).trim() : undefined),
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
      businessId: String(businessId),
      userId: String(userId),
    },
    success_url: `${frontendUrl}/#/signup-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/#/payment-pending?businessId=${businessId}&canceled=true`,
  };

  if (Number.isInteger(mapping.trialPeriodDays) && mapping.trialPeriodDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: mapping.trialPeriodDays,
    };
  }

  await pool.query(
    `UPDATE businesses
     SET billing_required = $1, billing_status = $2, pending_plan = $3
     WHERE id = $4`,
    [true, BILLING_PENDING, plan, businessId]
  );

  return stripeClient.checkout.sessions.create(sessionParams);
}

// =============================================================================
// Create Stripe Checkout Session (subscription mode)
// =============================================================================
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const stripeClient = getStripe();
    const pool = getAdminPool();

    const { plan, email, businessId } = req.body || {};
    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan) return res.status(400).json({ error: 'Invalid plan. Must be Starter, Pro, or Pro Max' });
    const normalizedBusinessId = normalizeBusinessId(businessId);
    if (!normalizedBusinessId) return res.status(400).json({ error: 'Missing or invalid businessId in request' });
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const business = await getOwnedBusiness(pool, normalizedBusinessId, userId);
    if (!business) return res.status(403).json({ error: 'Forbidden: user does not own this business' });

    const session = await createCheckoutSessionForBusiness({
      stripeClient,
      pool,
      req,
      businessId: normalizedBusinessId,
      userId,
      plan: normalizedPlan,
      email,
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Payments.create-checkout-session error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Resume payment for businesses that are pending billing.
router.post('/create-checkout-session-resume', authMiddleware, async (req, res) => {
  try {
    const stripeClient = getStripe();
    const pool = getAdminPool();
    const normalizedBusinessId = normalizeBusinessId(req.body && req.body.businessId);
    const userId = req.userId;
    if (!normalizedBusinessId) return res.status(400).json({ error: 'Missing or invalid businessId in request' });
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const business = await getOwnedBusiness(pool, normalizedBusinessId, userId);
    if (!business) return res.status(403).json({ error: 'Forbidden' });

    const billingStatus = String(business.billing_status || BILLING_ACTIVE).toLowerCase();
    const pendingPlan = normalizePlan(business.pending_plan) || normalizePlan(business.plan) || 'Starter';
    if (!business.billing_required) {
      return res.status(409).json({ error: 'Billing is not required for this business' });
    }
    if (billingStatus === BILLING_ACTIVE) {
      return res.status(409).json({ error: 'Business is already active' });
    }

    const session = await createCheckoutSessionForBusiness({
      stripeClient,
      pool,
      req,
      businessId: normalizedBusinessId,
      userId,
      plan: pendingPlan,
      email: req.user && req.user.email ? String(req.user.email).trim() : undefined,
    });

    res.json({ url: session.url, id: session.id, plan: pendingPlan, businessId: String(normalizedBusinessId) });
  } catch (err) {
    console.error('Payments.create-checkout-session-resume error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to resume checkout session' });
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
  const stripeClient = getStripe();
  const pool = getAdminPool();
  const { metadata, customer, subscription } = session;

  const requestedPlan = normalizePlan(metadata?.plan);
  const businessId = metadata?.businessId;
  const userId = metadata?.userId;
  const normalizedBusinessId = normalizeBusinessId(businessId);

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

  const businessRes = await pool.query(
    'SELECT pending_plan FROM businesses WHERE id = $1',
    [normalizedBusinessId]
  );
  const pendingPlan = normalizePlan(businessRes?.rows?.[0]?.pending_plan);
  const finalPlan = requestedPlan || pendingPlan || 'Starter';
  let trialEndsAt = null;
  if (subscription) {
    try {
      const sub = await stripeClient.subscriptions.retrieve(subscription);
      trialEndsAt = toIsoOrNull(sub && sub.trial_end);
    } catch (err) {
      console.warn('checkout.session.completed: could not fetch subscription trial_end', err.message);
    }
  }

  console.log(`Checkout completed for business ${normalizedBusinessId}, plan=${finalPlan}, subscription=${subscription}`);

  // Update business with plan and Stripe IDs
  await pool.query(
    `UPDATE businesses
     SET plan = $1,
         stripe_customer_id = $2,
         stripe_subscription_id = $3,
         billing_required = $4,
         billing_status = $5,
         pending_plan = NULL,
         trial_ends_at = $6
     WHERE id = $7`,
    [finalPlan, customer || null, subscription || null, true, BILLING_ACTIVE, trialEndsAt, normalizedBusinessId]
  );

  console.log(`Business ${normalizedBusinessId} upgraded to plan: ${finalPlan}`);
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
  const trialEndsAt = toIsoOrNull(subscription && subscription.trial_end);

  if (status === 'active' || status === 'trialing') {
    await pool.query(
      `UPDATE businesses
       SET billing_status = $1, trial_ends_at = $2
       WHERE id = $3`,
      [BILLING_ACTIVE, trialEndsAt, business.id]
    );
    console.log(`Subscription ${subscriptionId} status is ${status} (business ${business.id})`);
    return;
  }

  const downgradedStatus = (status === 'canceled')
    ? BILLING_CANCELED
    : BILLING_PAST_DUE;
  await pool.query(
    `UPDATE businesses
     SET billing_status = $1
     WHERE id = $2`,
    [downgradedStatus, business.id]
  );
  console.log(`Business ${business.id} set to billing status ${downgradedStatus} (subscription ${status})`);
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

    const businessRes = await pool.query(
      `SELECT plan, billing_required, billing_status, pending_plan, trial_ends_at
       FROM businesses WHERE id = $1`,
      [businessId]
    );
    const business = businessRes.rows[0] || null;

    res.json({
      status: session.payment_status,
      plan: (business && business.plan) || session.metadata?.plan || null,
      businessId: String(businessId),
      customerEmail: session.customer_email,
      billingRequired: Boolean(business && business.billing_required),
      billingStatus: String((business && business.billing_status) || BILLING_PENDING),
      pendingPlan: (business && business.pending_plan) || null,
      trialEndsAt: (business && business.trial_ends_at) || null,
    });
  } catch (err) {
    console.error('verify-session error:', err.message);
    res.status(400).json({ error: 'Invalid session' });
  }
});

module.exports = router;
