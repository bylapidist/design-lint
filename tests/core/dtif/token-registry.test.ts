import test from 'node:test';
import assert from 'node:assert/strict';

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { parseDtifTokensFromFile } from '../../../src/core/dtif/parse.js';
import { DtifTokenRegistry } from '../../../src/core/dtif/token-registry.js';
import { createDtifToken } from '../../helpers/dtif.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');

void test('DtifTokenRegistry retrieves tokens by pointer with theme fallback', async () => {
  const { tokens } = await parseDtifTokensFromFile(dataModelPath);
  const registry = new DtifTokenRegistry({ default: tokens });

  const token = registry.getByPointer('#/color/button/background');
  assert(token);
  assert.equal(token.pointer, '#/color/button/background');
  assert.equal(token.name, 'background');

  const missing = registry.getByPointer('#/unknown/token');
  assert.equal(missing, undefined);
});

void test('DtifTokenRegistry applies name transforms for lookups', () => {
  const tokens = [
    createDtifToken('ColorGroup.PrimaryColor', {
      type: 'color',
      value: '#fff',
    }),
  ];

  const registry = new DtifTokenRegistry(
    { default: tokens },
    {
      nameTransform: 'kebab-case',
    },
  );

  const token = registry.getByName('color-group.primary-color');
  assert(token);
  assert.equal(token.pointer, '#/ColorGroup/PrimaryColor');
});

void test('DtifTokenRegistry dedupes tokens across themes', () => {
  const shared = createDtifToken('color.base', {
    type: 'color',
    value: '#ccc',
  });
  const darkOnly = createDtifToken('color.dark', {
    type: 'color',
    value: '#000',
  });

  const registry = new DtifTokenRegistry({
    default: [shared],
    dark: [shared, darkOnly],
  });

  const all = registry.getTokens();
  assert.equal(all.length, 2);
  assert.deepEqual(all.map((token) => token.pointer).sort(), [
    '#/color/base',
    '#/color/dark',
  ]);

  const darkTokens = registry.getTokens('dark');
  assert.equal(darkTokens.length, 2);
  assert.deepEqual(darkTokens.map((token) => token.pointer).sort(), [
    '#/color/base',
    '#/color/dark',
  ]);
});
