import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { parseDtifTokensFromFile } from '../../../src/core/dtif/parse.js';
import {
  indexDtifTokens,
  createDtifNameIndex,
  pointerSegmentsToName,
} from '../../../src/core/dtif/token-index.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');

void test('indexDtifTokens maps tokens by pointer', async () => {
  const { tokens } = await parseDtifTokensFromFile(dataModelPath);
  const map = indexDtifTokens(tokens);

  assert.strictEqual(map.size, tokens.length);
  const alias = map.get('#/color/button/text');
  assert(alias);
  assert.strictEqual(
    alias.metadata.description,
    'Alias to the background color',
  );
});

void test('createDtifNameIndex normalizes names with transforms', async () => {
  const { tokens } = await parseDtifTokensFromFile(dataModelPath);
  const index = createDtifNameIndex(tokens, 'PascalCase');

  assert(index.has('Color.Button.Background'));
  assert(index.has('Typography.Button.FontSize'));
  const typography = index.get('Typography.Button.FontSize');
  assert(typography);
  assert.strictEqual(typography.type, 'dimension');
});

void test('pointerSegmentsToName converts segments to dot paths', () => {
  const segments = ['typography', 'button', 'font-size'];
  assert.strictEqual(
    pointerSegmentsToName(segments),
    'typography.button.font-size',
  );
  assert.strictEqual(
    pointerSegmentsToName(segments, 'camelCase'),
    'typography.button.fontSize',
  );
});
