/**
 * Unit tests for the domain guard index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as domainGuards from '../../../../src/utils/guards/domain/index.js';

void test('domain guards export token and rule checks', () => {
  assert.equal(typeof domainGuards.isDesignTokens, 'function');
  assert.equal(typeof domainGuards.isRuleModule, 'function');
  assert.equal(typeof domainGuards.isThemeRecord, 'function');
});

void test('domain guards execute without throwing', () => {
  domainGuards.isDesignTokens(null);
  domainGuards.isRuleModule({});
  domainGuards.isThemeRecord(null);
});
