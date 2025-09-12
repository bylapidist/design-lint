/**
 * Unit tests for the top-level configuration utilities entry point.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../../src/config/index.js';

void test('config exposes expected members', () => {
  assert.deepEqual(
    Object.keys(config).sort(),
    [
      'ConfigTokenProvider',
      'configSchema',
      'defineConfig',
      'loadConfig',
      'loadTokens',
      'normalizeTokens',
      'wrapTokenError',
      'resolveConfigFile',
    ].sort(),
  );
});

void test('members are usable', () => {
  assert.equal(typeof config.defineConfig, 'function');
  assert.equal(typeof config.loadConfig, 'function');
  assert.equal(typeof config.resolveConfigFile, 'function');
  assert.equal(typeof config.loadTokens, 'function');
  assert.equal(typeof config.normalizeTokens, 'function');
  assert.equal(typeof config.ConfigTokenProvider, 'function');
  assert.ok(config.configSchema instanceof Object);
});
