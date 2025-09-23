import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenResolvedTokens,
  getFlattenedTokenLocation,
  pointerToPath,
  pointerListToPaths,
  toLegacyLocation,
} from '../../src/core/dtif/flatten-tokens.js';
import type { ResolvedTokenView } from '../../src/core/types.js';

void test('pointerToPath converts JSON pointers into dot-separated paths', () => {
  assert.equal(
    pointerToPath('#/palette/brand/primary'),
    'palette.brand.primary',
  );
  assert.equal(pointerToPath('#'), '');
});

void test('pointerListToPaths normalises alias pointers', () => {
  assert.deepEqual(pointerListToPaths(['#/palette/brand/primary']), [
    'palette.brand.primary',
  ]);
  assert.equal(pointerListToPaths(undefined), undefined);
});

void test('toLegacyLocation falls back to line 1 column 1 when metadata is missing', () => {
  assert.deepEqual(toLegacyLocation(undefined), { line: 1, column: 1 });
});

void test('flattenResolvedTokens converts resolved DTIF tokens into flattened view', () => {
  const resolved: ResolvedTokenView[] = [
    {
      pointer: '#/palette/brand/primary',
      type: 'color',
      value: {
        colorSpace: 'srgb',
        components: [0, 0.435, 1],
      },
      aliases: ['#/button/label'],
      metadata: {
        description: 'Brand primary colour',
        deprecated: undefined,
        extensions: { 'org.example': { grade: 'A' } },
        source: {
          uri: 'file:///tokens.json',
          start: { line: 5, column: 7 },
          end: { line: 10, column: 3 },
        },
      },
    },
    {
      pointer: '#/button/label',
      type: 'color',
      value: {
        colorSpace: 'srgb',
        components: [0, 0.435, 1],
      },
      aliases: ['#/palette/brand/primary'],
      metadata: {
        description: 'Alias token',
        deprecated: '#/palette/brand/primary',
        extensions: undefined,
        source: undefined,
      },
    },
  ];

  const flattened = flattenResolvedTokens(resolved);
  assert.equal(flattened.length, 2);
  const primary = flattened.find(
    (token) => token.path === 'palette.brand.primary',
  );
  assert.ok(primary);
  assert.deepEqual(primary.aliases, ['button.label']);
  assert.deepEqual(primary.metadata.loc, { line: 5, column: 7 });
  assert.deepEqual(primary.metadata.extensions, {
    'org.example': { grade: 'A' },
  });
  const alias = flattened.find((token) => token.path === 'button.label');
  assert.ok(alias);
  assert.deepEqual(alias.aliases, ['palette.brand.primary']);
  assert.deepEqual(alias.metadata.loc, { line: 1, column: 1 });

  const storedLocation = getFlattenedTokenLocation('palette.brand.primary');
  assert.deepEqual(storedLocation, { line: 5, column: 7 });
});
