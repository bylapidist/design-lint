/**
 * Unit tests for configSchema.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { configSchema } from '../../src/config/schema.js';
import type { Config } from '../../src/core/linter.js';

const srgb = (
  components: readonly [number, number, number],
): Record<string, unknown> => ({
  $type: 'color',
  $value: {
    colorSpace: 'srgb',
    components: [...components],
  },
});

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

void test('rejects non-design token objects', () => {
  assert.throws(
    () => configSchema.parse({ tokens: { light: { color: '#fff' } } }),
    /Tokens must be DTIF token documents/,
  );
});

void test('accepts design token object with metadata', () => {
  const parsed = configSchema.parse({
    tokens: {
      $version: '1.0.0',
      $description: 'metadata example',
      color: { primary: srgb([0, 0, 0]) },
    },
  });
  const tokens = parsed.tokens as {
    $description: string;
    color: {
      primary: { $value: { components: number[]; colorSpace: string } };
    };
  };
  assert.equal(tokens.$description, 'metadata example');
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
});
