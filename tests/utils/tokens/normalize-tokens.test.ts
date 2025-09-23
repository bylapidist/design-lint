/**
 * Unit tests for normalizeTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTokens,
  normalizeDtifTokens,
} from '../../../src/utils/tokens/normalize-tokens.js';
import { DTIF_MIGRATION_MESSAGE } from '../../../src/core/dtif/messages.js';
import { TokenParseError } from '../../../src/adapters/node/token-parser.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('rejects legacy design tokens with migration guidance', async () => {
  await assert.rejects(
    () =>
      normalizeTokens({
        color: { primary: { $type: 'color', $value: '#000' } },
      }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.equal(error.message.includes(DTIF_MIGRATION_MESSAGE), true);
      return true;
    },
  );
});

void test('rejects legacy theme records with migration guidance', async () => {
  await assert.rejects(
    () =>
      normalizeTokens({
        light: { color: { primary: { $type: 'color', $value: '#000' } } },
      }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.equal(error.message.includes(DTIF_MIGRATION_MESSAGE), true);
      return true;
    },
  );
});

void test('includes migration guidance for invalid legacy tokens', async () => {
  await assert.rejects(
    () =>
      normalizeTokens({
        light: { color: { primary: { $type: 'color' } } },
      }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.equal(error.message.includes(DTIF_MIGRATION_MESSAGE), true);
      return true;
    },
  );
});

void test('includes migration guidance for invalid legacy design token objects', async () => {
  await assert.rejects(
    () => normalizeTokens({ color: { primary: { $type: 'color' } } }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.equal(error.message.includes(DTIF_MIGRATION_MESSAGE), true);
      return true;
    },
  );
});

void test('normalizes DTIF design tokens to default theme', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: srgb([0, 0, 0]),
      },
    },
  } as const;
  const result = await normalizeTokens(tokens);
  assert.deepEqual(result.default, tokens);
});

void test('normalizes DTIF theme records', async () => {
  const tokens = await normalizeTokens({
    light: {
      $version: '1.0.0',
      color: { primary: { $type: 'color', $value: srgb([1, 1, 1]) } },
    },
    dark: {
      $version: '1.0.0',
      color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
    },
  });
  assert.deepEqual(tokens.light, {
    $version: '1.0.0',
    color: { primary: { $type: 'color', $value: srgb([1, 1, 1]) } },
  });
  assert.deepEqual(tokens.dark, {
    $version: '1.0.0',
    color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
  });
});

void test('normalizeTokens rejects invalid DTIF documents', async () => {
  await assert.rejects(
    () =>
      normalizeTokens({
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0, 0] },
          },
        },
      }),
    TokenParseError,
  );
});

void test('returns empty object for non-object input', async () => {
  const tokens = await normalizeTokens(null);
  assert.deepEqual(tokens, {});
});

void test('normalizeDtifTokens normalizes DTIF documents to default theme', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: srgb([0, 0, 0]),
      },
    },
  } as const;
  const result = await normalizeDtifTokens(tokens);
  assert.deepEqual(result.default, tokens);
});

void test('normalizeDtifTokens validates DTIF theme records', async () => {
  const tokens = {
    $schema: 'https://example.com/schema',
    light: {
      $version: '1.0.0',
      color: { primary: { $type: 'color', $value: srgb([1, 1, 1]) } },
    },
    dark: {
      $version: '1.0.0',
      color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
    },
  } as const;

  const result = await normalizeDtifTokens(tokens);
  assert.deepEqual(result.light, tokens.light);
  assert.deepEqual(result.dark, tokens.dark);
});

void test('normalizeDtifTokens rejects invalid DTIF documents', async () => {
  await assert.rejects(
    () =>
      normalizeDtifTokens({
        light: {
          $version: '1.0.0',
          color: {
            primary: {
              $type: 'color',
              $value: { colorSpace: 'srgb', components: [0, 0, 0, 0] },
            },
          },
        },
      }),
    TokenParseError,
  );
});

void test('normalizeDtifTokens rejects legacy token structures', async () => {
  await assert.rejects(
    () =>
      normalizeDtifTokens({
        light: { color: { primary: { $type: 'color', $value: '#000' } } },
      }),
    new RegExp(DTIF_MIGRATION_MESSAGE),
  );
});

void test('normalizeDtifTokens returns empty object for non-object input', async () => {
  const result = await normalizeDtifTokens(undefined);
  assert.deepEqual(result, {});
});
