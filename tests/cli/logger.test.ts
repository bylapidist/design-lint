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

void test('createLogger.error logs Error messages and sets exitCode', () => {
  const logger = createLogger(() => false);
  const errors: string[] = [];
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  console.error = (msg?: unknown) => errors.push(String(msg));
  try {
    process.exitCode = undefined;
    logger.error(new Error('test error'));
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes('test error'));
    assert.equal(process.exitCode, 1);
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});

void test('createLogger.error stringifies non-Error values', () => {
  const logger = createLogger(() => false);
  const errors: string[] = [];
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  console.error = (msg?: unknown) => errors.push(String(msg));
  try {
    process.exitCode = undefined;
    logger.error('plain string error');
    assert.ok(errors[0].includes('plain string error'));
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});
