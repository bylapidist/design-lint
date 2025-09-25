/**
 * Unit tests for normalizeTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DtifTokenParseError } from '../../../src/adapters/node/token-parser.js';
import { normalizeTokens } from '../../../src/utils/tokens/normalize-tokens.js';
import { getDtifFlattenedTokens } from '../../../src/utils/tokens/dtif-cache.js';

const srgb = (
  components: readonly [number, number, number],
): Record<string, unknown> => ({
  $type: 'color',
  $value: {
    colorSpace: 'srgb',
    components: [...components],
  },
});

void test('normalizes DTIF tokens to default theme', async () => {
  const tokens = {
    $version: '1.0.0',
    color: { primary: srgb([0, 0, 0]) },
  };
  const result = await normalizeTokens(tokens);
  const color = result.default as {
    $version: string;
    color: { primary: { $value: { components: number[] } } };
  };
  assert.equal(color.$version, '1.0.0');
  assert.deepEqual(color.color.primary.$value.components, [0, 0, 0]);
  const flattened = getDtifFlattenedTokens(result.default);
  assert(flattened);
  const [token] = flattened;
  assert(token);
  assert.equal(token.pointer, '#/color/primary');
});

void test('validates DTIF theme records', async () => {
  const tokens = await normalizeTokens({
    light: {
      $version: '1.0.0',
      color: { primary: srgb([0, 0, 0]) },
    },
  });
  const light = tokens.light as {
    $version: string;
    color: { primary: { $value: { components: number[] } } };
  };
  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value.components, [0, 0, 0]);
  const flattened = getDtifFlattenedTokens(tokens.light);
  assert(flattened);
  const [token] = flattened;
  assert(token);
  assert.equal(token.pointer, '#/color/primary');
});

void test('normalizes theme records without shared token keys when metadata present', async () => {
  const tokens = await normalizeTokens({
    light: {
      $version: '1.0.0',
      color: { primary: srgb([0, 0, 0]) },
    },
    dark: {
      $version: '1.0.0',
      space: { medium: { $type: 'dimension', $value: '1rem' } },
    },
  });
  assert('light' in tokens);
  assert('dark' in tokens);
  assert.equal('default' in tokens, false);
  const light = tokens.light as {
    color: { primary: { $value: { components: number[] } } };
  };
  assert.deepEqual(light.color.primary.$value.components, [0, 0, 0]);
  const dark = tokens.dark as { space: { medium: { $value: string } } };
  assert.equal(dark.space.medium.$value, '1rem');
});

void test('throws on invalid tokens', async () => {
  await assert.rejects(
    normalizeTokens({
      light: {
        $version: '1.0.0',
        color: { primary: { $type: 'color' } },
      },
    }),
    DtifTokenParseError,
  );
});

void test('throws on invalid design token object', async () => {
  await assert.rejects(
    normalizeTokens({
      $version: '1.0.0',
      color: { primary: { $type: 'color' } },
    }),
    DtifTokenParseError,
  );
});

void test('returns empty object for non-object input', async () => {
  const tokens = await normalizeTokens(null);
  assert.deepEqual(tokens, {});
});

void test('caches empty flattened tokens for metadata-only documents', async () => {
  const tokens = await normalizeTokens({ $version: '1.0.0' });
  const flattened = getDtifFlattenedTokens(tokens.default);
  assert(flattened);
  assert.equal(flattened.length, 0);
});
