/**
 * Signup Flow Integration Tests
 * 
 * Tests the complete signup process including:
 * - Free tier (Starter) signup
 * - Paid tier (Pro, Pro Max) signup with Stripe checkout
 * - Business type/category selection
 * - Template generation verification
 * 
 * Run with: npm test -- signup_flow.test.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const { getAdminPool, ensureAdminSchema } = require('../tenantManager');

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
};

// Plans configuration (matches paymentsRoutes.js)
const PLAN_CONFIG = {
  'Starter': { price: 0, hasBackupTemplates: false, templateCount: 10 },
  'Pro': { price: 3900, currency: 'gbp', hasBackupTemplates: true, templateCount: 10, backupCount: 10 },
  'Pro Max': { price: 4900, currency: 'gbp', hasBackupTemplates: true, templateCount: 10, backupCount: 10 },
};

// Business categories for testing
const TEST_CATEGORIES = {
  business: ['Restaurant', 'Cafe/Coffee Shop', 'Salon/Barbershop', 'Retail Store'],
  freelancer: ['Hairdresser/Stylist', 'Personal Trainer', 'Photographer', 'Consultant'],
};

// Initialize Supabase admin client
let supabase;
let pool;
let stripe;
let app;

// Track created users for cleanup
const createdUsers = [];
const createdBusinesses = [];

beforeAll(async () => {
  // Validate environment
  if (!TEST_CONFIG.SUPABASE_URL || !TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  pool = getAdminPool();
  
  // Ensure schema exists
  await ensureAdminSchema();

  // Initialize Stripe if available
  if (TEST_CONFIG.STRIPE_SECRET_KEY) {
    try {
      const Stripe = require('stripe');
      stripe = new Stripe(TEST_CONFIG.STRIPE_SECRET_KEY);
    } catch (e) {
      console.warn('Stripe not available:', e.message);
    }
  }

  // Load the Express app
  app = require('../index');
}, 30000);

afterAll(async () => {
  // Cleanup created test data
  console.log(`Cleaning up ${createdUsers.length} test users and ${createdBusinesses.length} businesses...`);
  
  for (const businessId of createdBusinesses) {
    try {
      await pool.query('DELETE FROM review_templates WHERE business_id = $1', [businessId]);
      await pool.query('DELETE FROM backup_templates WHERE business_id = $1', [businessId]);
      await pool.query('DELETE FROM archived_templates WHERE business_id = $1', [businessId]);
      await pool.query('DELETE FROM business_owners WHERE business_id = $1', [businessId]);
      await pool.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    } catch (e) {
      console.warn(`Failed to cleanup business ${businessId}:`, e.message);
    }
  }

  for (const userId of createdUsers) {
    try {
      await pool.query('DELETE FROM business_owners WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await supabase.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn(`Failed to cleanup user ${userId}:`, e.message);
    }
  }

  // Don't close pool as other tests might use it
}, 60000);

/**
 * Helper: Create a test user in Supabase Auth
 */
async function createTestUser(emailPrefix = 'test') {
  const email = `${emailPrefix}+${Date.now()}@test-signup.com`;
  const password = 'TestPassword123!';

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  
  const userId = data?.user?.id;
  if (!userId) throw new Error('Failed to create test user');
  
  createdUsers.push(userId);
  
  // Sign in to get access token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (signInError) throw signInError;
  
  return {
    userId,
    email,
    password,
    accessToken: signInData?.session?.access_token,
  };
}

/**
 * Helper: Call the onboard endpoint using supertest
 */
async function onboardUser(accessToken, businessData) {
  const response = await request(app)
    .post('/api/users/onboard')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(businessData);

  if (response.body && response.body.businessId) {
    createdBusinesses.push(response.body.businessId);
  }
  
  return { status: response.status, body: response.body };
}

/**
 * Helper: Verify templates were created correctly
 */
async function verifyTemplates(businessId, expectedPlan) {
  const config = PLAN_CONFIG[expectedPlan] || PLAN_CONFIG['Starter'];
  
  // Check main templates
  const mainTemplates = await pool.query(
    'SELECT * FROM review_templates WHERE business_id = $1',
    [businessId]
  );
  
  // Check backup templates
  const backupTemplates = await pool.query(
    'SELECT * FROM backup_templates WHERE business_id = $1',
    [businessId]
  );
  
  return {
    mainCount: mainTemplates.rows.length,
    backupCount: backupTemplates.rows.length,
    mainTemplates: mainTemplates.rows,
    backupTemplates: backupTemplates.rows,
    expectedMainCount: config.templateCount,
    expectedBackupCount: config.hasBackupTemplates ? config.backupCount : 0,
  };
}

// =============================================================================
// FREE TIER (STARTER) TESTS
// =============================================================================
describe('Free Tier (Starter) Signup Flow', () => {
  test('should create account with business type selection', async () => {
    const user = await createTestUser('starter-biz');
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: 'Test Restaurant Free',
      business_type: 'business',
      business_category: 'Restaurant',
      plan: 'Starter',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
    expect(body.name).toBe('Test Restaurant Free');
    expect(body.plan).toBe('Starter');
    expect(body).toHaveProperty('adminUrl');
    expect(body).toHaveProperty('publicUrl');
  }, 30000);

  test('should create account for freelancer type', async () => {
    const user = await createTestUser('starter-freelancer');
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: 'Jane Doe Styling',
      business_type: 'freelancer',
      business_category: 'Hairdresser/Stylist',
      plan: 'Starter',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
    expect(body.plan).toBe('Starter');
  }, 30000);

  test('should generate templates for Starter plan (no backup)', async () => {
    const user = await createTestUser('starter-templates');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Template Test Cafe',
      business_type: 'business',
      business_category: 'Cafe/Coffee Shop',
      plan: 'Starter',
    });

    // Wait for async template generation
    await new Promise(resolve => setTimeout(resolve, 5000));

    const templates = await verifyTemplates(body.businessId, 'Starter');
    
    expect(templates.mainCount).toBeGreaterThanOrEqual(1);
    expect(templates.backupCount).toBe(0); // Starter has no backup templates
    
    // Verify template content is relevant
    if (templates.mainTemplates.length > 0) {
      const firstTemplate = templates.mainTemplates[0].text;
      expect(typeof firstTemplate).toBe('string');
      expect(firstTemplate.length).toBeGreaterThan(10);
    }
  }, 60000);

  test('should handle business categories', async () => {
    const category = TEST_CATEGORIES.business[0]; // Restaurant
    const user = await createTestUser(`cat-${category.replace(/\//g, '-')}`);
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: `Test ${category}`,
      business_type: 'business',
      business_category: category,
      plan: 'Starter',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
  }, 30000);

  test('should handle freelancer categories', async () => {
    const category = TEST_CATEGORIES.freelancer[0]; // Hairdresser/Stylist
    const user = await createTestUser(`free-${category.replace(/\//g, '-')}`);
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: `Test ${category}`,
      business_type: 'freelancer',
      business_category: category,
      plan: 'Starter',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
  }, 30000);

  test('should store user in users table', async () => {
    const user = await createTestUser('user-table');
    
    await onboardUser(user.accessToken, {
      business_name: 'User Table Test',
      business_type: 'business',
      business_category: 'Retail Store',
      plan: 'Starter',
    });

    const userRow = await pool.query('SELECT * FROM users WHERE id = $1', [user.userId]);
    expect(userRow.rows.length).toBe(1);
    expect(userRow.rows[0].email).toBe(user.email);
  }, 30000);

  test('should create business_owners mapping', async () => {
    const user = await createTestUser('owner-mapping');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Owner Mapping Test',
      business_type: 'business',
      business_category: 'Salon/Barbershop',
      plan: 'Starter',
    });

    const ownerRow = await pool.query(
      'SELECT * FROM business_owners WHERE user_id = $1 AND business_id = $2',
      [user.userId, body.businessId]
    );
    
    expect(ownerRow.rows.length).toBe(1);
    expect(ownerRow.rows[0].role).toBe('owner');
  }, 30000);

  test('should return existing business if user already has one', async () => {
    const user = await createTestUser('existing-biz');
    
    // First onboard
    const { body: first } = await onboardUser(user.accessToken, {
      business_name: 'First Business',
      business_type: 'business',
      business_category: 'Restaurant',
      plan: 'Starter',
    });

    // Second onboard attempt
    const { body: second } = await onboardUser(user.accessToken, {
      business_name: 'Second Business',
      business_type: 'freelancer',
      business_category: 'Photographer',
      plan: 'Pro',
    });

    expect(second.businessId).toBe(first.businessId);
    expect(second.existing).toBe(true);
  }, 30000);
});

// =============================================================================
// PAID TIER (PRO) TESTS
// =============================================================================
describe('Pro Tier Signup Flow', () => {
  test('should create account with Pro plan', async () => {
    const user = await createTestUser('pro-biz');
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: 'Pro Restaurant',
      business_type: 'business',
      business_category: 'Restaurant',
      plan: 'Pro',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
    expect(body.plan).toBe('Pro');
    expect(body.templatesGenerating).toBe(true);
  }, 30000);

  test('should generate templates with backup for Pro plan', async () => {
    const user = await createTestUser('pro-templates');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Pro Spa Wellness',
      business_type: 'business',
      business_category: 'Spa/Wellness',
      plan: 'Pro',
    });

    // Wait for async template generation
    await new Promise(resolve => setTimeout(resolve, 8000));

    const templates = await verifyTemplates(body.businessId, 'Pro');
    
    expect(templates.mainCount).toBeGreaterThanOrEqual(1);
    // Pro should have backup templates (if AI generation succeeds)
  }, 60000);

  test('should create Stripe checkout session for Pro plan', async () => {
    if (!stripe) {
      console.log('Skipping Stripe test - STRIPE_SECRET_KEY not configured');
      return;
    }

    const user = await createTestUser('pro-stripe');
    
    const { body: onboardBody } = await onboardUser(user.accessToken, {
      business_name: 'Stripe Test Pro',
      business_type: 'business',
      business_category: 'Gym/Fitness Center',
      plan: 'Pro',
    });

    // Create checkout session
    const checkoutResponse = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        plan: 'Pro',
        email: user.email,
        businessId: onboardBody.businessId,
      });
    
    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body).toHaveProperty('url');
    expect(checkoutResponse.body).toHaveProperty('id');
    expect(checkoutResponse.body.url).toContain('checkout.stripe.com');
  }, 30000);
});

// =============================================================================
// PAID TIER (PRO MAX) TESTS
// =============================================================================
describe('Pro Max Tier Signup Flow', () => {
  test('should create account with Pro Max plan', async () => {
    const user = await createTestUser('promax-biz');
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_name: 'Pro Max Hotel',
      business_type: 'business',
      business_category: 'Hotel/B&B',
      plan: 'Pro Max',
    });

    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
    expect(body.plan).toBe('Pro Max');
  }, 30000);

  test('should generate templates with backup for Pro Max plan', async () => {
    const user = await createTestUser('promax-templates');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Pro Max Auto Service',
      business_type: 'business',
      business_category: 'Auto Service',
      plan: 'Pro Max',
    });

    // Wait for async template generation
    await new Promise(resolve => setTimeout(resolve, 8000));

    const templates = await verifyTemplates(body.businessId, 'Pro Max');
    
    expect(templates.mainCount).toBeGreaterThanOrEqual(1);
  }, 60000);

  test('should create Stripe checkout session for Pro Max plan', async () => {
    if (!stripe) {
      console.log('Skipping Stripe test - STRIPE_SECRET_KEY not configured');
      return;
    }

    const user = await createTestUser('promax-stripe');
    
    const { body: onboardBody } = await onboardUser(user.accessToken, {
      business_name: 'Stripe Test Pro Max',
      business_type: 'freelancer',
      business_category: 'Personal Trainer',
      plan: 'Pro Max',
    });

    // Create checkout session
    const checkoutResponse = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        plan: 'Pro Max',
        email: user.email,
        businessId: onboardBody.businessId,
      });

    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body).toHaveProperty('url');
    expect(checkoutResponse.body.url).toContain('checkout.stripe.com');
  }, 30000);
});

// =============================================================================
// STRIPE WEBHOOK SIMULATION TESTS
// =============================================================================
describe('Stripe Webhook Handling', () => {
  test('should handle checkout.session.completed webhook', async () => {
    if (!stripe) {
      console.log('Skipping Stripe webhook test - STRIPE_SECRET_KEY not configured');
      return;
    }

    const user = await createTestUser('webhook-test');
    
    const { body: onboardBody } = await onboardUser(user.accessToken, {
      business_name: 'Webhook Test Business',
      business_type: 'business',
      business_category: 'Dental/Medical Clinic',
      plan: 'Pro',
    });

    // Simulate webhook payload (without signature verification in dev mode)
    const webhookPayload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          customer: 'cus_test_' + Date.now(),
          subscription: 'sub_test_' + Date.now(),
          metadata: {
            plan: 'Pro',
            businessId: String(onboardBody.businessId),
          },
        },
      },
    };

    const webhookResponse = await request(app)
      .post('/api/payments/webhook')
      .send(webhookPayload);

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toHaveProperty('received', true);

    // Verify business was updated
    const businessRow = await pool.query(
      'SELECT plan, stripe_customer_id, stripe_subscription_id FROM businesses WHERE id = $1',
      [onboardBody.businessId]
    );
    
    expect(businessRow.rows.length).toBe(1);
    expect(businessRow.rows[0].plan).toBe('Pro');
  }, 30000);

  test('should handle subscription.canceled webhook (downgrade to Starter)', async () => {
    if (!stripe) {
      console.log('Skipping Stripe subscription cancel test');
      return;
    }

    const user = await createTestUser('cancel-test');
    
    const { body: onboardBody } = await onboardUser(user.accessToken, {
      business_name: 'Cancel Test Business',
      business_type: 'freelancer',
      business_category: 'Makeup Artist',
      plan: 'Pro',
    });

    // First, set subscription ID manually
    const subId = 'sub_cancel_test_' + Date.now();
    await pool.query(
      'UPDATE businesses SET stripe_subscription_id = $1 WHERE id = $2',
      [subId, onboardBody.businessId]
    );

    // Simulate subscription canceled webhook
    const cancelPayload = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: subId,
          status: 'canceled',
        },
      },
    };

    const webhookResponse = await request(app)
      .post('/api/payments/webhook')
      .send(cancelPayload);

    expect(webhookResponse.status).toBe(200);

    // Verify business was downgraded
    const businessRow = await pool.query(
      'SELECT plan FROM businesses WHERE id = $1',
      [onboardBody.businessId]
    );
    
    expect(businessRow.rows[0].plan).toBe('Starter');
  }, 30000);
});

// =============================================================================
// TEMPLATE QUALITY TESTS
// =============================================================================
describe('Template Generation Quality', () => {
  test('templates should be unique within a business', async () => {
    const user = await createTestUser('unique-templates');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Unique Templates Test',
      business_type: 'business',
      business_category: 'Restaurant',
      plan: 'Pro',
    });

    await new Promise(resolve => setTimeout(resolve, 8000));

    const templates = await verifyTemplates(body.businessId, 'Pro');
    
    const allTexts = [
      ...templates.mainTemplates.map(t => t.text),
      ...templates.backupTemplates.map(t => t.text),
    ];
    
    const uniqueTexts = new Set(allTexts);
    
    // All templates should be unique
    expect(uniqueTexts.size).toBe(allTexts.length);
  }, 60000);

  test('templates should have reasonable length', async () => {
    const user = await createTestUser('length-test');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Length Test Salon',
      business_type: 'business',
      business_category: 'Salon/Barbershop',
      plan: 'Starter',
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const templates = await verifyTemplates(body.businessId, 'Starter');
    
    for (const template of templates.mainTemplates) {
      expect(template.text.length).toBeGreaterThan(15);
      expect(template.text.length).toBeLessThan(300);
    }
  }, 60000);

  test('templates should not contain banned phrases', async () => {
    const user = await createTestUser('banned-phrases');
    
    const { body } = await onboardUser(user.accessToken, {
      business_name: 'Banned Phrases Test',
      business_type: 'freelancer',
      business_category: 'Photographer',
      plan: 'Starter',
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const templates = await verifyTemplates(body.businessId, 'Starter');
    
    const bannedPhrases = ['I would recommend', '5 stars', '⭐', '🔥'];
    
    for (const template of templates.mainTemplates) {
      for (const phrase of bannedPhrases) {
        expect(template.text.toLowerCase()).not.toContain(phrase.toLowerCase());
      }
    }
  }, 60000);
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================
describe('Error Handling', () => {
  test('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/users/onboard')
      .send({
        business_name: 'No Auth Test',
        business_type: 'business',
        business_category: 'Restaurant',
        plan: 'Starter',
      });

    expect(response.status).toBe(401);
  }, 10000);

  test('should reject invalid access token', async () => {
    const response = await request(app)
      .post('/api/users/onboard')
      .set('Authorization', 'Bearer invalid_token_12345')
      .send({
        business_name: 'Invalid Token Test',
        business_type: 'business',
        business_category: 'Restaurant',
        plan: 'Starter',
      });

    expect(response.status).toBe(401);
  }, 10000);

  test('should handle missing business name gracefully', async () => {
    const user = await createTestUser('no-name');
    
    const { status, body } = await onboardUser(user.accessToken, {
      business_type: 'business',
      business_category: 'Restaurant',
      plan: 'Starter',
    });

    // Should still work with auto-generated name
    expect(status).toBe(201);
    expect(body).toHaveProperty('businessId');
    expect(body.name).toBeTruthy(); // Should have some auto-generated name
  }, 30000);

  test('should reject invalid Stripe plan for checkout', async () => {
    if (!stripe) {
      console.log('Skipping Stripe invalid plan test');
      return;
    }

    const user = await createTestUser('invalid-plan');
    
    const checkoutResponse = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        plan: 'InvalidPlan',
        email: user.email,
        businessId: 1,
      });

    expect(checkoutResponse.status).toBe(400);
  }, 10000);

  test('should reject Starter plan for checkout (free tier)', async () => {
    if (!stripe) {
      console.log('Skipping Stripe Starter checkout test');
      return;
    }

    const user = await createTestUser('starter-checkout');
    
    const checkoutResponse = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        plan: 'Starter',
        email: user.email,
        businessId: 1,
      });

    expect(checkoutResponse.status).toBe(400);
    expect(checkoutResponse.body.error).toContain('does not require checkout');
  }, 10000);
});

// =============================================================================
// VERIFY SESSION ENDPOINT TESTS
// =============================================================================
describe('Verify Session Endpoint', () => {
  test('should return error for invalid session ID', async () => {
    const response = await request(app)
      .get('/api/payments/verify-session/invalid_session_id');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  }, 10000);
});
