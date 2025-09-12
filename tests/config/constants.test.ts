/**
 * Unit tests for configuration constants.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_SEARCH_PLACES } from '../../src/config/constants.js';

void test('includes expected config filenames', () => {
  assert.ok(CONFIG_SEARCH_PLACES.includes('designlint.config.json'));
  assert.ok(CONFIG_SEARCH_PLACES.includes('.designlintrc.mts'));
});
