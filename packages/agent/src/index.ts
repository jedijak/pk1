import cron from 'node-cron';
import { runScan } from './scanner.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [index] ${message}`);
}

// ─── Start Cron Job ────────────────────────────────────────────────────────────

// Runs every 30 minutes
const CRON_EXPRESSION = '*/30 * * * *';

log('AA Agent starting...');

const task = cron.schedule(CRON_EXPRESSION, async () => {
  log('Cron triggered — running board scan...');
  try {
    const count = await runScan();
    log(`Scan complete. Recommendations written: ${count}`);
  } catch (err) {
    log(`Unhandled error in scan: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// Calculate next run time for startup message
function getNextRunTime(): string {
  const now = new Date();
  const nextMinutes = 30 - (now.getMinutes() % 30);
  const next = new Date(now.getTime() + nextMinutes * 60 * 1000);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next.toISOString();
}

log(`AA Agent started. Next scan at: ${getNextRunTime()}`);

// ─── Export runScan for external invocation (e.g. POST /agent/invoke) ─────────

export { runScan };
