import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenRule } from '../../src/utils/rules/index.js';
import type { RuleContext } from '../../src/core/types.js';

void test('tokenRule reports when tokens are missing', () => {
  const rule = tokenRule({
    name: 'design-token/example',
    meta: { description: 'example', category: 'design-token' },
    tokens: 'number',
    message: 'no tokens',
    getAllowed: () => new Set<number>(),
    create: () => ({}),
  });
  const reports: unknown[] = [];
  const ctx: RuleContext = {
    report: (m) => reports.push(m),
    getFlattenedTokens: () => [],
    sourceId: 'x',
  };
  const listener = rule.create(ctx);
  assert.equal(reports.length, 1);
  assert.deepEqual(listener, {});
});

void test('tokenRule passes allowed values to create', () => {
  let received: Set<number> | undefined;
  const rule = tokenRule({
    name: 'design-token/example',
    meta: { description: 'example', category: 'design-token' },
    tokens: 'number',
    message: 'no tokens',
    getAllowed(tokens) {
      const s = new Set<number>();
      for (const { token } of tokens) {
        if (typeof token.$value === 'number') s.add(token.$value);
      }
      return s;
    },
    create(_ctx, allowed) {
      received = allowed;
      return {};
    },
  });
  const reports: unknown[] = [];
  const ctx: RuleContext = {
    report: (m) => reports.push(m),
    getFlattenedTokens: () => [{ path: 'a', token: { $value: 2 } }],
    sourceId: 'x',
  };
  rule.create(ctx);
  assert.ok(received?.has(2));
});
