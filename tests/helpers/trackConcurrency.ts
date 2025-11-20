import fs from 'node:fs';
import { CacheManager } from '../../src/core/cache-manager.js';

const origProcess = CacheManager.prototype.processDocument;
let active = 0;
let max = 0;

CacheManager.prototype.processDocument = async function processDocument(
  ...args
) {
  active++;
  max = Math.max(max, active);
  try {
    return await origProcess.apply(this, args);
  } finally {
    active--;
  }
};

process.on('exit', () => {
  const p = process.env.CONCURRENCY_OUTPUT;
  if (p) fs.writeFileSync(p, String(max), 'utf8');
});
