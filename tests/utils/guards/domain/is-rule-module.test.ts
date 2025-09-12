/**
 * Unit tests for {@link isRuleModule} domain guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isRuleModule } from '../../../../src/utils/guards/domain/is-rule-module.js';

const valid = { name: 'x', create: () => ({}) };
const withMeta = {
  name: 'x',
  create: () => ({}),
  meta: { description: 'd' },
};

void test('isRuleModule rejects invalid modules', () => {
  assert.equal(isRuleModule(null), false);
  assert.equal(isRuleModule({ name: 'x' }), false);
  assert.equal(isRuleModule({ create: () => ({}) }), false);
});

void test('isRuleModule accepts basic rule modules', () => {
  assert.equal(isRuleModule(valid), true);
});

void test('isRuleModule respects options', () => {
  assert.equal(
    isRuleModule({ ...valid, name: '' }, { requireNonEmptyName: true }),
    false,
  );
  assert.equal(isRuleModule(valid, { requireNonEmptyName: true }), true);
  assert.equal(isRuleModule(valid, { requireMeta: true }), false);
  assert.equal(isRuleModule(withMeta, { requireMeta: true }), true);
  assert.equal(
    isRuleModule({ ...valid, meta: {} }, { requireMeta: true }),
    false,
  );
  assert.equal(
    isRuleModule({ ...valid, meta: { description: 1 } }, { requireMeta: true }),
    false,
  );
  assert.equal(
    isRuleModule(
      { ...valid, meta: { description: '' } },
      { requireMeta: true },
    ),
    false,
  );
});
