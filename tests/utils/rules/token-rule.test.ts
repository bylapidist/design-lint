/**
 * Unit tests for {@link tokenRule}.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rules } from '../../../src/utils/index.js';
import type {
  RuleContext,
  DtifFlattenedToken,
} from '../../../src/core/types.js';

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
    getDtifTokens: () => [],
    getTokenPath: (token) => token.pointer,
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
    getAllowed(_ctx, tokens) {
      const s = new Set<number>();
      for (const t of tokens) {
        if (typeof t.value === 'number') {
          s.add(t.value);
        }
      }
      return s;
    },
    create(_ctx, allowed) {
      received = allowed;
      return {};
    },
  });
  const reports: unknown[] = [];
  const token: DtifFlattenedToken = {
    id: '#/a',
    pointer: '#/a',
    path: ['a'],
    name: 'a',
    type: 'number',
    value: 2,
    metadata: { extensions: {} },
  };
  const ctx: RuleContext = {
    report: (m) => reports.push(m),
    getDtifTokens: () => [token],
    getTokenPath: () => 'a',
    sourceId: 'x',
  };
  rule.create(ctx);
  assert.ok(received?.has(2));
});

void test('tokenRule forwards DTIF tokens to getAllowed', () => {
  let received: readonly DtifFlattenedToken[] | undefined;
  const token: DtifFlattenedToken = {
    id: '#/opacity/low',
    pointer: '#/opacity/low',
    path: ['opacity', 'low'],
    name: 'opacity.low',
    type: 'number',
    value: 0.2,
    metadata: { extensions: {} },
  };
  const rule = tokenRule({
    name: 'design-token/example',
    meta: { description: 'example', category: 'design-token' },
    tokens: 'number',
    message: 'no tokens',
    getAllowed(_ctx, dtifTokens = []) {
      received = dtifTokens;
      return new Set([1]);
    },
    create: () => ({}),
  });
  const reports: unknown[] = [];
  const ctx: RuleContext = {
    report: (m) => reports.push(m),
    getDtifTokens: () => [token],
    getTokenPath: () => 'opacity.low',
    sourceId: 'x',
  };
  rule.create(ctx);
  assert.ok(received);
  assert.equal(received.length, 1);
  assert.equal(received[0], token);
});
