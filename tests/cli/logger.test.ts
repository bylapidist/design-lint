import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../../src/cli/logger.js';

void test('createLogger deduplicates warnings', () => {
  const logger = createLogger(() => false);
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (msg?: unknown) => warnings.push(String(msg));
  try {
    logger.warn('duplicate');
    logger.warn('duplicate');
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
});
