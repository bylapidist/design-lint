import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseDtifTokensFromFile } from '../../../src/core/dtif/parse.js';
import type {
  DtifFlattenedToken,
  TokenMetadata,
  TokenResolution,
} from '../../../src/core/types.js';

const fixturesDir = fileURLToPath(
  new URL('../../fixtures/dtif/', import.meta.url),
);
const dataModelPath = join(fixturesDir, 'data-model.tokens.json');
const fallbacksPath = join(fixturesDir, 'fallbacks.tokens.json');
const functionsPath = join(fixturesDir, 'functions.tokens.json');

function expectToken(
  token: DtifFlattenedToken | undefined,
  pointer: string,
): DtifFlattenedToken {
  assert.ok(token, `Expected token ${pointer}`);
  return token;
}

function expectMetadata(
  metadata: TokenMetadata | undefined,
  tokenId: string,
): TokenMetadata {
  assert.ok(metadata, `Expected metadata for token ${tokenId}`);
  return metadata;
}

function expectResolution(
  resolution: TokenResolution | undefined,
  tokenId: string,
): TokenResolution {
  assert.ok(resolution, `Expected resolution for token ${tokenId}`);
  return resolution;
}

void test('parseDtifTokensFromFile returns metadata and resolution snapshots', async () => {
  const { tokens, metadataIndex, resolutionIndex } =
    await parseDtifTokensFromFile(dataModelPath);

  const alias = expectToken(
    tokens.find((token) => token.pointer === '#/color/button/text'),
    '#/color/button/text',
  );

  const metadata = expectMetadata(metadataIndex.get(alias.id), alias.id);
  assert.strictEqual(metadata.description, 'Alias to the background color');
  const superseded = metadata.deprecated?.supersededBy;
  assert(superseded);
  assert.strictEqual(superseded.pointer, '#/color/button/background');

  const resolution = expectResolution(resolutionIndex.get(alias.id), alias.id);
  assert.strictEqual(resolution.references.length > 0, true);
  const terminal =
    resolution.resolutionPath[resolution.resolutionPath.length - 1];
  assert(terminal);
  assert.strictEqual(terminal.pointer, '#/color/button/background');
});

void test('parseDtifTokensFromFile preserves complex token values', async () => {
  const { tokens: fallbackTokens, diagnostics: fallbackDiagnostics } =
    await parseDtifTokensFromFile(fallbacksPath);

  assert.strictEqual(fallbackDiagnostics.length, 0);
  const dense = expectToken(
    fallbackTokens.find((token) => token.pointer === '#/spacing/grid/dense'),
    '#/spacing/grid/dense',
  );
  assert.deepStrictEqual(dense.value, [
    { $ref: '#/spacing/grid/base' },
    { dimensionType: 'length', value: 8, unit: 'px' },
  ]);

  const { tokens: functionTokens, diagnostics: functionDiagnostics } =
    await parseDtifTokensFromFile(functionsPath);

  assert.strictEqual(functionDiagnostics.length, 0);
  const double = expectToken(
    functionTokens.find((token) => token.pointer === '#/spacing/double'),
    '#/spacing/double',
  );
  assert.deepStrictEqual(double.value, {
    fn: 'css.calc',
    parameters: [{ $ref: '#/spacing/base' }, '*', 2],
  });
});
