/**
 * Cron Scheduler for Background Jobs
 * 
 * This module sets up scheduled background jobs using node-cron.
 * Jobs run independently of user requests.
 * 
 * Schedule format: 'minute hour day month weekday'
 * 
 * Examples:
 *   '0 2 * * *'     - Every day at 2:00 AM
 *   '0 0,6,12,18 * * *' - Every 6 hours (at 0, 6, 12, 18)
 *   '30 * * * *'    - Every hour at minute 30
 */

const cron = require('node-cron');
const templateGenerationJob = require('./templateGenerationJob');

// Configuration via environment variables
const GENERATION_SCHEDULE = process.env.TEMPLATE_GENERATION_CRON || '0 2 * * *'; // Default: 2 AM daily
const ENABLE_CRON = process.env.ENABLE_CRON_JOBS !== 'false'; // Enabled by default

let scheduledTasks = [];

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  if (!ENABLE_CRON) {
    console.info('[Cron] Cron jobs disabled via ENABLE_CRON_JOBS=false');
    return;
  }

  console.info('[Cron] Initializing scheduled jobs...');

  // Template Generation Job
  if (cron.validate(GENERATION_SCHEDULE)) {
    const task = cron.schedule(GENERATION_SCHEDULE, async () => {
      console.info(`[Cron] Running template generation job (schedule: ${GENERATION_SCHEDULE})`);
      try {
        const result = await templateGenerationJob.runGenerationJobForAll();
        console.info('[Cron] Template generation completed:', result.summary);
      } catch (err) {
        console.error('[Cron] Template generation failed:', err.message);
      }
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });

    scheduledTasks.push({ name: 'templateGeneration', task, schedule: GENERATION_SCHEDULE });
    console.info(`[Cron] Template generation scheduled: ${GENERATION_SCHEDULE}`);
  } else {
    console.error(`[Cron] Invalid cron expression: ${GENERATION_SCHEDULE}`);
  }

  console.info(`[Cron] ${scheduledTasks.length} job(s) scheduled`);
}

/**
 * Stop all cron jobs
 */
function stopAllJobs() {
  console.info('[Cron] Stopping all scheduled jobs...');
  for (const { name, task } of scheduledTasks) {
    task.stop();
    console.info(`[Cron] Stopped: ${name}`);
  }
  scheduledTasks = [];
}

/**
 * Get status of all scheduled jobs
 */
function getJobStatus() {
  return {
    enabled: ENABLE_CRON,
    jobs: scheduledTasks.map(({ name, schedule }) => ({
      name,
      schedule,
      nextRun: getNextRunTime(schedule)
    }))
  };
}

/**
 * Calculate approximate next run time for a cron expression
 */
function getNextRunTime(cronExpression) {
  try {
    // Simple approximation - for display purposes
    const parts = cronExpression.split(' ');
    const [minute, hour] = parts;
    
    if (hour !== '*' && minute !== '*') {
      const now = new Date();
      const next = new Date();
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    }
    return 'Varies based on schedule';
  } catch {
    return 'Unknown';
  }
}

module.exports = {
  initializeCronJobs,
  stopAllJobs,
  getJobStatus
};
