import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseDtifTokensFromFile } from '../../../src/core/dtif/parse.js';
import type { TokenDiagnostic } from '../../../src/core/types.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');
const fallbacksPath = join(fixturesDir, 'fallbacks.tokens.json');
const functionsPath = join(fixturesDir, 'functions.tokens.json');
const invalidPath = join(fixturesDir, 'invalid.tokens.json');

void test('parseDtifTokensFromFile returns flattened tokens with metadata and resolution', async () => {
  const result = await parseDtifTokensFromFile(dataModelPath);

  assert.strictEqual(result.diagnostics.length, 0);
  assert.deepStrictEqual(
    result.tokens.map((token) => token.pointer),
    [
      '#/color/button/background',
      '#/color/button/text',
      '#/typography/button/font-size',
      '#/typography/button/line-height',
      '#/typography/button/text',
    ],
  );

  const background = result.tokens.find(
    (token) => token.pointer === '#/color/button/background',
  );
  assert(background);
  assert.strictEqual(background.metadata.description, 'Solid brand fill');
  assert.deepStrictEqual(background.metadata.extensions, {
    'org.example.export': { legacyHex: '#006FFF' },
  });
  assert.strictEqual(background.metadata.source.uri, dataModelPath);

  const alias = result.tokens.find(
    (token) => token.pointer === '#/color/button/text',
  );
  assert(alias);
  assert.strictEqual(alias.type, 'color');
  assert.deepStrictEqual(alias.path, ['color', 'button', 'text']);
  assert.deepStrictEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
  assert.deepStrictEqual(alias.metadata.deprecated, {
    supersededBy: {
      pointer: '#/typography/button/text',
      uri: dataModelPath,
    },
  });
  const aliasResolution = alias.resolution;
  assert(aliasResolution);
  const [backgroundStep, aliasStep] = aliasResolution.resolutionPath;
  assert(backgroundStep);
  assert.strictEqual(backgroundStep.pointer, '#/color/button/background');
  assert(aliasStep);
  assert.strictEqual(aliasStep.pointer, '#/color/button/text');
});

void test('parseDtifTokensFromFile preserves fallback arrays and function payloads', async () => {
  const fallbackResult = await parseDtifTokensFromFile(fallbacksPath);
  assert.strictEqual(fallbackResult.diagnostics.length, 0);

  const dense = fallbackResult.tokens.find(
    (token) => token.pointer === '#/spacing/grid/dense',
  );
  assert(dense);
  assert.deepStrictEqual(dense.value, [
    { $ref: '#/spacing/grid/base' },
    { dimensionType: 'length', value: 8, unit: 'px' },
  ]);

  const functionResult = await parseDtifTokensFromFile(functionsPath);
  assert.strictEqual(functionResult.diagnostics.length, 0);

  const double = functionResult.tokens.find(
    (token) => token.pointer === '#/spacing/double',
  );
  assert(double);
  assert.deepStrictEqual(double.value, {
    fn: 'css.calc',
    parameters: [{ $ref: '#/spacing/base' }, '*', 2],
  });
});

void test('parseDtifTokensFromFile forwards diagnostics to callbacks', async () => {
  const warned: TokenDiagnostic[] = [];
  const forwarded: TokenDiagnostic[] = [];

  const result = await parseDtifTokensFromFile(invalidPath, {
    warn: (diagnostic) => {
      if (diagnostic.severity !== 'error') {
        warned.push(diagnostic);
      }
    },
    onDiagnostic: (diagnostic) => {
      forwarded.push(diagnostic);
    },
  });

  assert(forwarded.length >= 1);
  assert.deepStrictEqual(forwarded, Array.from(result.diagnostics));
  const [first] = forwarded;
  assert(first);
  assert.ok(first.code);
  assert(first.target);
  assert.equal(first.target.uri, invalidPath);
  assert.ok(first.message.includes('Invalid'));
  assert(warned.every((diagnostic) => diagnostic.severity !== 'error'));
});
