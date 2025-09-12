/**
 * Unit tests for defineConfig helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { defineConfig } from '../../src/config/define-config.js';
import type { Config } from '../../src/core/linter.js';

void test('defineConfig returns provided object', () => {
  const cfg: Config = { rules: { foo: 'warn' } };
  const result = defineConfig(cfg);
  assert.equal(result, cfg);
});
