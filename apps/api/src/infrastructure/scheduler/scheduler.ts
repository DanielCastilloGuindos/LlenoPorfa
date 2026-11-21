import {
  handleSyncAll,
  handleSyncCrude,
  handleSyncElectric,
  handleSyncGas,
  handleSyncHydrogen,
} from '../../presentation/controllers/syncController.js';

let schedulerInterval: any = null;

export function startInternalScheduler() {
  const enabled = process.env.ENABLE_CRON_SYNC === 'true' || process.env.ENABLE_CRON_SYNC === '1';
  if (!enabled) {
    console.log('[Scheduler] Background cron scheduler disabled (ENABLE_CRON_SYNC is not true).');
    return;
  }

  console.log('[Scheduler] Background cron scheduler initialized.');

  // Run initial sync after 5 seconds to populate empty database
  setTimeout(async () => {
    try {
      console.log('[Scheduler] Running initial bootstrap sync...');
      await handleSyncAll();
    } catch (err) {
      console.error('[Scheduler] Bootstrap sync error:', err);
    }
  }, 5000);

  // MITECO gas stations: every 4 hours
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log('[Scheduler] Scheduled Gas Stations Sync triggering...');
      await handleSyncGas();
    } catch (err) {
      console.error('[Scheduler] Scheduled Gas Sync error:', err);
    }
  }, FOUR_HOURS_MS);

  // Crude Oil: every 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log('[Scheduler] Scheduled Crude Oil Sync triggering...');
      await handleSyncCrude();
    } catch (err) {
      console.error('[Scheduler] Scheduled Crude Sync error:', err);
    }
  }, TWENTY_FOUR_HOURS_MS);

  // Electric & Hydrogen: every 24 hours
  setInterval(async () => {
    try {
      console.log('[Scheduler] Scheduled Electric & Hydrogen Sync triggering...');
      await Promise.all([handleSyncElectric(), handleSyncHydrogen()]);
    } catch (err) {
      console.error('[Scheduler] Scheduled Alt-Fuels Sync error:', err);
    }
  }, TWENTY_FOUR_HOURS_MS);
}
