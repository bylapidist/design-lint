/**
 * Unit tests for {@link tokenRule}.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rules } from '../../../src/utils/index.js';
import type { RuleContext } from '../../../src/core/types.js';

const { tokenRule } = rules;

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
      for (const t of tokens) {
        if (typeof t.value === 'number') s.add(t.value);
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
    getFlattenedTokens: () => [
      {
        path: 'a',
        value: 2,
        metadata: {
          description: undefined,
          extensions: undefined,
          deprecated: undefined,
          loc: { line: 1, column: 1 },
        },
      },
    ],
    sourceId: 'x',
  };
  rule.create(ctx);
  assert.ok(received?.has(2));
});
