import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../src/utils/index.js';

const { isRuleModule } = guards.domain;

const valid = { name: 'x', create: () => ({}) };
const withMeta = {
  name: 'x',
  create: () => ({}),
  meta: { description: 'd' },
};

void test('isRuleModule accepts basic rule modules', () => {
  assert.equal(isRuleModule(valid), true);
});

void test('isRuleModule respects options', () => {
  assert.equal(
    isRuleModule({ ...valid, name: '' }, { requireNonEmptyName: true }),
    false,
  );
  assert.equal(isRuleModule(valid, { requireMeta: true }), false);
  assert.equal(isRuleModule(withMeta, { requireMeta: true }), true);
});
