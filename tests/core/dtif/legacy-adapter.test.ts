import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { flattenDtifDocument } from '../../../src/core/dtif/flatten.js';
import { parseDtifFile } from '../../../src/core/dtif/session.js';
import { toLegacyFlattenedTokens } from '../../../src/core/dtif/legacy-adapter.js';
import type { FlattenDtifResult } from '../../../src/core/dtif/flatten.js';
import type { FlattenedToken } from '../../../src/core/types.js';

const fixturesDir = fileURLToPath(
  new URL('../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');
const fallbacksPath = join(fixturesDir, 'fallbacks.tokens.json');

void test('toLegacyFlattenedTokens maps DTIF metadata and alias traces', async () => {
  const parseResult = await parseDtifFile(dataModelPath);
  const flattened: FlattenDtifResult = flattenDtifDocument(parseResult);
  const legacy: FlattenedToken[] = toLegacyFlattenedTokens(flattened.tokens);

  assert.deepEqual(
    legacy.map((token) => token.path),
    [
      'color.button.background',
      'color.button.text',
      'typography.button.font-size',
      'typography.button.line-height',
      'typography.button.text',
    ],
  );

  const background = legacy.find(
    (token) => token.path === 'color.button.background',
  );
  assert(background);
  assert.equal(background.type, 'color');
  assert.deepEqual(background.aliases, undefined);
  assert.deepEqual(background.metadata.description, 'Solid brand fill');
  assert.deepEqual(background.metadata.extensions, {
    'org.example.export': { legacyHex: '#006FFF' },
  });
  assert.equal(background.metadata.loc.line, 7);
  assert.equal(background.metadata.loc.column, 21);

  const alias = legacy.find((token) => token.path === 'color.button.text');
  assert(alias);
  assert.deepEqual(alias.aliases, ['color.button.background']);
  assert.equal(alias.metadata.loc.line, 23);
  assert.equal(alias.metadata.loc.column, 15);
  assert.equal(alias.metadata.deprecated, '#/typography/button/text');
});

void test('toLegacyFlattenedTokens preserves fallback and function payloads', async () => {
  const parseResult = await parseDtifFile(fallbacksPath);
  const flattened: FlattenDtifResult = flattenDtifDocument(parseResult);
  const legacy: FlattenedToken[] = toLegacyFlattenedTokens(flattened.tokens);

  const dense = legacy.find((token) => token.path === 'spacing.grid.dense');
  assert(dense);
  assert.deepEqual(dense.value, [
    { $ref: '#/spacing/grid/base' },
    { dimensionType: 'length', value: 8, unit: 'px' },
  ]);

  const double = legacy.find((token) => token.path === 'spacing.double');
  assert(double);
  assert.deepEqual(double.value, {
    fn: 'css.calc',
    parameters: [{ $ref: '#/spacing/base' }, '*', 2],
  });
});
