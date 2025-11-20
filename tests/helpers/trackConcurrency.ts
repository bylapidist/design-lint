import fs from 'node:fs';
import { CacheManager } from '../../src/core/cache-manager.js';

const originalProcess = Reflect.get(
  CacheManager.prototype,
  'processDocument',
) as (
  this: CacheManager,
  ...args: Parameters<CacheManager['processDocument']>
) => ReturnType<CacheManager['processDocument']>;

const runOriginal = (
  self: CacheManager,
  ...args: Parameters<CacheManager['processDocument']>
) => originalProcess.apply(self, args);
let active = 0;
let max = 0;

CacheManager.prototype.processDocument = async function processDocument(
  ...args
) {
  active++;
  max = Math.max(max, active);
  try {
    return await runOriginal(this, ...args);
  } finally {
    active--;
  }
};

process.on('exit', () => {
  const p = process.env.CONCURRENCY_OUTPUT;
  if (p) fs.writeFileSync(p, String(max), 'utf8');
});
