/**
 * Unit tests for configuration constants.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_ARRAY_MERGE_KEYS,
  CONFIG_SEARCH_PLACES,
  isConfigArrayMergeKey,
} from '../../src/config/constants.js';

void test('includes expected config filenames', () => {
  assert.ok(CONFIG_SEARCH_PLACES.includes('designlint.config.json'));
  assert.ok(CONFIG_SEARCH_PLACES.includes('.designlintrc.mts'));
});

void test('includes expected array-merge keys', () => {
  assert.deepEqual(CONFIG_ARRAY_MERGE_KEYS, [
    'plugins',
    'ignoreFiles',
    'patterns',
  ]);
});

void test('detects array-merge keys', () => {
  assert.equal(isConfigArrayMergeKey('plugins'), true);
  assert.equal(isConfigArrayMergeKey('ignoreFiles'), true);
  assert.equal(isConfigArrayMergeKey('patterns'), true);
  assert.equal(isConfigArrayMergeKey('rules'), false);
});
