/**
 * Unit tests for normalizeTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTokens } from '../../../src/utils/tokens/normalize-tokens.js';

void test('normalizes design tokens to default theme', () => {
  const tokens = { color: { primary: { $type: 'color', $value: '#000' } } };
  const result = normalizeTokens(tokens);
  const color = result.default as { color: { primary: { $value: string } } };
  assert.equal(color.color.primary.$value, '#000');
});

void test('validates theme records', () => {
  const tokens = normalizeTokens({
    light: { color: { primary: { $type: 'color', $value: '#000' } } },
  });
  const light = tokens.light as { color: { primary: { $value: string } } };
  assert.equal(light.color.primary.$value, '#000');
});

void test('throws on invalid tokens', () => {
  assert.throws(
    () =>
      normalizeTokens({
        light: { color: { primary: { $type: 'color' } } },
      }),
    /Failed to parse tokens for theme "light"/i,
  );
});

void test('throws on invalid design token object', () => {
  assert.throws(
    () => normalizeTokens({ color: { primary: { $type: 'color' } } }),
    /missing \$value/i,
  );
});

void test('returns empty object for non-object input', () => {
  const tokens = normalizeTokens(null);
  assert.deepEqual(tokens, {});
});
