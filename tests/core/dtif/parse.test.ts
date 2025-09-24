import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  parseDtifTokensFromFile,
  parseInlineDtifTokens,
  parseDtifTokenObject,
} from '../../../src/core/dtif/parse.js';
import type { TokenDiagnostic } from '../../../src/core/types.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');

void test('parseDtifTokensFromFile flattens tokens and exposes resolver state', async () => {
  const { tokens, diagnostics, document, graph, resolver } =
    await parseDtifTokensFromFile(dataModelPath);

  assert.strictEqual(diagnostics.length, 0);
  assert(document);
  assert.strictEqual(document.$version, '1.0.0');
  assert(graph);
  assert(resolver);

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

  const aliasResolution = resolver.resolve('#/color/button/text');
  assert(aliasResolution.token);
  assert.deepStrictEqual(aliasResolution.token.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
});

void test('parseInlineDtifTokens forwards diagnostics to callbacks', async () => {
  const invalidDocument = JSON.stringify({
    $version: '1.0.0',
    color: {
      alias: {
        $type: 'color',
        $ref: '#/color/missing',
      },
    },
  });

  const forwarded: TokenDiagnostic[] = [];
  const warned: TokenDiagnostic[] = [];

  const { diagnostics } = await parseInlineDtifTokens(invalidDocument, {
    uri: 'inline:invalid',
    onDiagnostic: (diagnostic) => {
      forwarded.push(diagnostic);
    },
    warn: (diagnostic) => {
      if (diagnostic.severity !== 'error') {
        warned.push(diagnostic);
      }
    },
  });

  assert(diagnostics.length >= 2);
  assert.strictEqual(forwarded.length, diagnostics.length);
  assert.deepStrictEqual(forwarded, diagnostics);
  assert.ok(warned.every((diagnostic) => diagnostic.severity !== 'error'));

  const [firstDiagnostic] = diagnostics;
  assert(firstDiagnostic);
  assert(firstDiagnostic.target);
  assert.strictEqual(firstDiagnostic.target.uri, 'inline:invalid');
});

void test('parseDtifTokenObject flattens inline documents', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
      secondary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
    },
  };

  const { tokens, diagnostics } = await parseDtifTokenObject(document, {
    uri: 'inline:memory',
  });

  assert.strictEqual(diagnostics.length, 0);
  assert.deepStrictEqual(
    tokens.map((token) => token.pointer),
    ['#/color/primary', '#/color/secondary'],
  );
});
