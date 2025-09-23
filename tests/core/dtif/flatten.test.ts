import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DiagnosticCodes } from '@lapidist/dtif-parser';
import { flattenDtifDocument } from '../../../src/core/dtif/flatten.js';
import { parseDtifFile } from '../../../src/core/dtif/session.js';
import type { TokenDiagnostic } from '../../../src/core/types.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');
const fallbacksPath = join(fixturesDir, 'fallbacks.tokens.json');
const functionsPath = join(fixturesDir, 'functions.tokens.json');

void test('flattenDtifDocument flattens tokens with metadata and alias traces', async () => {
  const parseResult = await parseDtifFile(dataModelPath);
  const { tokens, diagnostics } = flattenDtifDocument(parseResult);

  assert.strictEqual(diagnostics.length, 0);
  assert.deepStrictEqual(
    tokens.map((token) => token.pointer),
    [
      '#/color/button/background',
      '#/color/button/text',
      '#/typography/button/font-size',
      '#/typography/button/line-height',
      '#/typography/button/text',
    ],
  );

  const background = tokens.find(
    (token) => token.pointer === '#/color/button/background',
  );
  assert(background);
  const backgroundLocation = background.location;
  assert(backgroundLocation);
  const backgroundSpan = backgroundLocation.span;
  assert(backgroundSpan);
  assert.strictEqual(backgroundLocation.pointer, '#/color/button/background');
  assert.strictEqual(backgroundSpan.start.line, 7);
  assert.strictEqual(backgroundSpan.start.column, 21);
  assert.strictEqual(background.metadata.description, 'Solid brand fill');
  assert.deepStrictEqual(background.metadata.extensions, {
    'org.example.export': { legacyHex: '#006FFF' },
  });

  const alias = tokens.find((token) => token.pointer === '#/color/button/text');
  assert(alias);
  const aliasLocation = alias.location;
  assert(aliasLocation);
  const aliasSpan = aliasLocation.span;
  assert(aliasSpan);
  assert.strictEqual(aliasLocation.pointer, '#/color/button/text');
  assert.strictEqual(aliasSpan.start.line, 23);
  assert.strictEqual(aliasSpan.start.column, 15);
  assert.strictEqual(alias.type, 'color');
  assert.deepStrictEqual(alias.segments, ['color', 'button', 'text']);
  assert.deepStrictEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
  assert.deepStrictEqual(alias.metadata.deprecated, {
    $replacement: '#/typography/button/text',
  });
  const aliasResolution = alias.resolution;
  assert(aliasResolution);
  const [aliasStep, targetStep] = aliasResolution.trace;
  assert(aliasStep);
  assert.strictEqual(aliasStep.kind, 'alias');
  assert(targetStep);
  assert.strictEqual(targetStep.pointer, '#/color/button/background');
});

void test('flattenDtifDocument preserves fallback arrays and function payloads', async () => {
  const fallbackResult = await parseDtifFile(fallbacksPath);
  const fallbackFlattened = flattenDtifDocument(fallbackResult);
  assert.strictEqual(fallbackFlattened.diagnostics.length, 0);

  const dense = fallbackFlattened.tokens.find(
    (token) => token.pointer === '#/spacing/grid/dense',
  );
  assert(dense);
  assert.deepStrictEqual(dense.value, [
    { $ref: '#/spacing/grid/base' },
    { dimensionType: 'length', value: 8, unit: 'px' },
  ]);

  const functionResult = await parseDtifFile(functionsPath);
  const functionFlattened = flattenDtifDocument(functionResult);
  assert.strictEqual(functionFlattened.diagnostics.length, 0);

  const double = functionFlattened.tokens.find(
    (token) => token.pointer === '#/spacing/double',
  );
  assert(double);
  assert.deepStrictEqual(double.value, {
    fn: 'css.calc',
    parameters: [{ $ref: '#/spacing/base' }, '*', 2],
  });
});

void test('flattenDtifDocument forwards diagnostics to warn callbacks', async () => {
  const parseResult = await parseDtifFile(functionsPath);
  parseResult.diagnostics.add({
    code: DiagnosticCodes.core.NOT_IMPLEMENTED,
    message: 'simulated warning',
    severity: 'warning',
    pointer: '#/spacing/base',
  });
  const warned: string[] = [];
  const forwarded: TokenDiagnostic[] = [];

  const { diagnostics } = flattenDtifDocument(parseResult, {
    warn: (message) => warned.push(message),
    onDiagnostic: (diagnostic) => {
      forwarded.push(diagnostic);
    },
  });

  assert.strictEqual(diagnostics.length, 1);
  const [diagnostic] = diagnostics;
  assert(diagnostic);
  assert.strictEqual(diagnostic.message, 'simulated warning');
  assert.strictEqual(diagnostic.severity, 'warning');
  assert.strictEqual(diagnostic.pointer, '#/spacing/base');
  assert.strictEqual(warned.length, 1);
  const [warningMessage] = warned;
  assert(warningMessage);
  assert.match(warningMessage, /simulated warning/);
  assert.match(warningMessage, /#\/spacing\/base/);
  assert.deepStrictEqual(forwarded, diagnostics);
});
