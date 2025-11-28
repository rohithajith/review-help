/**
 * Background Template Generation Job
 * 
 * This runs as a scheduled job (cron) to proactively generate templates
 * for all businesses that need them, rather than waiting for triggers.
 * 
 * Can be triggered:
 * 1. Via cron schedule (e.g., daily at 2 AM)
 * 2. Manually via API endpoint
 * 3. As a standalone script: node jobs/templateGenerationJob.js
 */

const { getAdminPool } = require('../tenantManager');
const generationService = require('../services/generationService');

// Configuration
const MIN_BACKUP_THRESHOLD = 5;  // Generate if backups fall below this
const MIN_ARCHIVED_FOR_GENERATION = 10;  // Need at least 10 archived to generate

/**
 * Check a single business and generate templates if needed
 */
async function processBusinessGeneration(pool, businessId, businessName) {
  console.info(`[TemplateJob] Checking business ${businessId}: ${businessName}`);
  
  try {
    // Check backup count
    const backupResult = await pool.query(
      'SELECT COUNT(*) as count FROM backup_templates WHERE business_id = $1',
      [businessId]
    );
    const backupCount = parseInt(backupResult.rows[0].count, 10);
    
    // Check archived count
    const archivedResult = await pool.query(
      'SELECT COUNT(*) as count FROM archived_templates WHERE business_id = $1',
      [businessId]
    );
    const archivedCount = parseInt(archivedResult.rows[0].count, 10);
    
    console.info(`[TemplateJob] Business ${businessId}: backups=${backupCount}, archived=${archivedCount}`);
    
    // Decision logic
    if (backupCount >= MIN_BACKUP_THRESHOLD) {
      console.info(`[TemplateJob] Business ${businessId}: Sufficient backups (${backupCount}), skipping`);
      return { businessId, status: 'skipped', reason: 'sufficient_backups', backupCount, archivedCount };
    }
    
    if (archivedCount < MIN_ARCHIVED_FOR_GENERATION) {
      console.info(`[TemplateJob] Business ${businessId}: Not enough archived (${archivedCount}), skipping`);
      return { businessId, status: 'skipped', reason: 'insufficient_archived', backupCount, archivedCount };
    }
    
    // Generate new templates
    console.info(`[TemplateJob] Business ${businessId}: Triggering generation...`);
    await generationService.generateFromArchived(pool, businessId);
    
    // Verify generation succeeded
    const newBackupResult = await pool.query(
      'SELECT COUNT(*) as count FROM backup_templates WHERE business_id = $1',
      [businessId]
    );
    const newBackupCount = parseInt(newBackupResult.rows[0].count, 10);
    
    return { 
      businessId, 
      status: 'generated', 
      previousBackups: backupCount,
      newBackups: newBackupCount,
      archivedUsed: archivedCount
    };
    
  } catch (err) {
    console.error(`[TemplateJob] Error processing business ${businessId}:`, err.message);
    return { businessId, status: 'error', error: err.message };
  }
}

/**
 * Run generation job for all businesses
 */
async function runGenerationJobForAll() {
  console.info('[TemplateJob] Starting scheduled template generation job...');
  const startTime = Date.now();
  
  try {
    const pool = getAdminPool();
    
    // Get all businesses
    const businessesResult = await pool.query('SELECT id, name FROM businesses ORDER BY id');
    const businesses = businessesResult.rows;
    
    console.info(`[TemplateJob] Found ${businesses.length} businesses to check`);
    
    const results = [];
    
    // Process each business sequentially (to avoid overwhelming the API)
    for (const business of businesses) {
      const result = await processBusinessGeneration(pool, business.id, business.name);
      results.push({ ...result, businessName: business.name });
      
      // Small delay between businesses to be nice to the API
      if (result.status === 'generated') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const duration = Date.now() - startTime;
    const generated = results.filter(r => r.status === 'generated').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    console.info(`[TemplateJob] Completed in ${duration}ms: generated=${generated}, skipped=${skipped}, errors=${errors}`);
    
    return {
      success: true,
      duration,
      summary: { total: businesses.length, generated, skipped, errors },
      results
    };
    
  } catch (err) {
    console.error('[TemplateJob] Job failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Run generation for a specific business
 */
async function runGenerationForBusiness(businessId) {
  console.info(`[TemplateJob] Manual trigger for business ${businessId}`);
  
  try {
    const pool = getAdminPool();
    
    // Verify business exists
    const bizResult = await pool.query('SELECT id, name FROM businesses WHERE id = $1', [businessId]);
    if (bizResult.rows.length === 0) {
      return { success: false, error: 'Business not found' };
    }
    
    const business = bizResult.rows[0];
    const result = await processBusinessGeneration(pool, business.id, business.name);
    
    return {
      success: true,
      businessId,
      businessName: business.name,
      ...result
    };
    
  } catch (err) {
    console.error(`[TemplateJob] Manual trigger failed for business ${businessId}:`, err.message);
    return { success: false, businessId, error: err.message };
  }
}

/**
 * Get generation status for all businesses
 */
async function getGenerationStatus() {
  try {
    const pool = getAdminPool();
    
    const query = `
      SELECT 
        b.id,
        b.name,
        (SELECT COUNT(*) FROM review_templates WHERE business_id = b.id) as active_count,
        (SELECT COUNT(*) FROM backup_templates WHERE business_id = b.id) as backup_count,
        (SELECT COUNT(*) FROM archived_templates WHERE business_id = b.id) as archived_count
      FROM businesses b
      ORDER BY b.id
    `;
    
    const result = await pool.query(query);
    
    return {
      success: true,
      businesses: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        activeTemplates: parseInt(row.active_count, 10),
        backupTemplates: parseInt(row.backup_count, 10),
        archivedTemplates: parseInt(row.archived_count, 10),
        needsGeneration: parseInt(row.backup_count, 10) < MIN_BACKUP_THRESHOLD && 
                         parseInt(row.archived_count, 10) >= MIN_ARCHIVED_FOR_GENERATION,
        canGenerate: parseInt(row.archived_count, 10) >= MIN_ARCHIVED_FOR_GENERATION
      }))
    };
    
  } catch (err) {
    console.error('[TemplateJob] Status check failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  runGenerationJobForAll,
  runGenerationForBusiness,
  getGenerationStatus,
  MIN_BACKUP_THRESHOLD,
  MIN_ARCHIVED_FOR_GENERATION
};

// Allow running as standalone script
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  
  console.info('[TemplateJob] Running as standalone script...');
  
  runGenerationJobForAll()
    .then(result => {
      console.info('[TemplateJob] Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('[TemplateJob] Fatal error:', err);
      process.exit(1);
    });
}
