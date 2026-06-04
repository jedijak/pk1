/**
 * One-shot scan script — calls runScan() once and exits.
 * Usage: npm run scan
 */

import { runScan } from './scanner.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [scan] ${message}`);
}

log('Running one-shot board scan...');

runScan()
  .then((count) => {
    log(`Scan finished. Recommendations written: ${count}`);
    process.exit(0);
  })
  .catch((err) => {
    log(`Scan failed with error: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
