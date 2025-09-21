/**
 * Unit tests for configSchema.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { configSchema } from '../../src/config/schema.js';
import type { Config } from '../../src/core/linter.js';

interface IssueContainer {
  issues?: unknown;
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractCustomIssueMessage(issues: unknown[]): string | undefined {
  const queue = [...issues];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === null) continue;
    if (Array.isArray(current)) {
      for (const item of current) {
        queue.unshift(item);
      }
      continue;
    }
    if (!isRecord(current)) continue;
    const code = current.code;
    const message = current.message;
    const errors = current.errors;
    if (
      typeof code === 'string' &&
      code === 'custom' &&
      typeof message === 'string'
    ) {
      return message;
    }
    if (Array.isArray(errors)) {
      for (const item of errors) {
        queue.unshift(item);
      }
    }
  }
  return undefined;
}

function hasIssues(value: unknown): value is IssueContainer {
  return typeof value === 'object' && value !== null && 'issues' in value;
}

function getIssueList(error: unknown): unknown[] {
  if (hasIssues(error) && Array.isArray(error.issues)) {
    return error.issues;
  }
  return [];
}

void test('accepts valid configuration', () => {
  const parsed = configSchema.parse({ tokens: {}, rules: {} });
  assert.deepEqual(parsed, { tokens: {}, rules: {} });
});

void test('rejects unknown properties', () => {
  assert.throws(() => configSchema.parse({ foo: 1 } as unknown as Config));
});

void test('rejects invalid rule severity', () => {
  assert.throws(
    () => configSchema.parse({ rules: { a: 'invalid' } }),
    /Invalid/,
  );
});

void test('rejects absolute token file path', () => {
  assert.throws(
    () => configSchema.parse({ tokens: { theme: '/abs/path.tokens.json' } }),
    /Token file paths must be relative/,
  );
});

void test('accepts theme record with relative token file', () => {
  const parsed = configSchema.parse({
    tokens: { light: './light.tokens.json' },
  });
  assert.deepEqual(parsed, { tokens: { light: './light.tokens.json' } });
});

void test('accepts theme record with DTIF extension', () => {
  const parsed = configSchema.parse({
    tokens: { base: './base.dtif.json' },
  });
  assert.deepEqual(parsed, { tokens: { base: './base.dtif.json' } });
});

void test('rejects non-design token objects', () => {
  try {
    configSchema.parse({ tokens: { light: { color: '#fff' } } });
    assert.fail('Expected configSchema.parse to throw');
  } catch (error) {
    const issues = getIssueList(error);
    const detail = extractCustomIssueMessage(issues);
    assert.ok(
      detail?.includes('DTIF validation failed'),
      detail ?? 'Expected DTIF validation error message',
    );
  }
});

void test('accepts design token object with metadata', () => {
  const parsed = configSchema.parse({
    tokens: {
      $schema: 'https://dtif.lapidist.net/schema/core.json',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  });
  const tokens = parsed.tokens;
  if (!isRecord(tokens)) {
    assert.fail('Parsed tokens must be a record');
  }
  const schema = tokens.$schema;
  assert.equal(schema, 'https://dtif.lapidist.net/schema/core.json');
  const color = isRecord(tokens.color) ? tokens.color : undefined;
  const primary = isRecord(color?.primary) ? color.primary : undefined;
  const value = isRecord(primary) ? primary.$value : undefined;
  assert.deepEqual(value, { colorSpace: 'srgb', components: [0, 0, 0] });
});
