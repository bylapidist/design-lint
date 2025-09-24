import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DtifTokenParseError,
  parseDtifTokensFile,
  readDtifTokensFile,
} from '../../src/adapters/node/token-parser.js';
import { getDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('parseDtifTokensFile reads a .tokens.json file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.tokens.json');
  const document: DesignTokens = {
    $version: '1.0.0',
    color: {
      blue: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 1] },
      },
    },
  };
  await writeFile(file, JSON.stringify(document), 'utf8');

  const result = await parseDtifTokensFile(file);
  assert.strictEqual(result.tokens.length, 1);
  assert.strictEqual(result.tokens[0]?.pointer, '#/color/blue');
  assert.deepStrictEqual(result.tokens[0]?.value, {
    colorSpace: 'srgb',
    components: [0, 0, 1],
  });
});

void test('parseDtifTokensFile reads a .tokens.yaml file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.tokens.yaml');
  const yaml = [
    '$version: "1.0.0"',
    'color:',
    '  blue:',
    '    $type: color',
    '    $value:',
    '      colorSpace: srgb',
    '      components:',
    '        - 0',
    '        - 0',
    '        - 1',
  ].join('\n');
  await writeFile(file, yaml, 'utf8');

  const result = await parseDtifTokensFile(file);
  assert.strictEqual(result.tokens.length, 1);
  assert.strictEqual(result.tokens[0]?.pointer, '#/color/blue');
  assert.strictEqual(result.tokens[0]?.type, 'color');
});

void test('parseDtifTokensFile rejects unsupported file extensions', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.json');
  await writeFile(file, '{}', 'utf8');

  await assert.rejects(
    () => parseDtifTokensFile(file),
    /Unsupported design tokens file/,
  );
});

void test('parseDtifTokensFile reports location on parse error', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'bad.tokens.json');
  await writeFile(file, 'this is not valid JSON', 'utf8');

  await assert.rejects(
    () => parseDtifTokensFile(file),
    (err: unknown) => {
      assert.ok(err instanceof DtifTokenParseError);
      assert.strictEqual(err.source, file);
      assert.match(err.format(), /Failed to parse DTIF document/);
      return true;
    },
  );
});

void test('readDtifTokensFile rejects legacy DTCG tokens', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'legacy.tokens.json');
  const document = {
    color: {
      brand: { $type: 'color', $value: '#fff' },
      link: { $value: '{color.brand}' },
    },
  } as unknown as DesignTokens;
  await writeFile(file, JSON.stringify(document), 'utf8');

  await assert.rejects(() => readDtifTokensFile(file), DtifTokenParseError);
});

void test('readDtifTokensFile surfaces DTIF diagnostics for invalid documents', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'invalid.tokens.json');
  const document: DesignTokens = {
    $version: '1.0.0',
    color: {
      bad: {
        $type: 'color',
        $ref: '#/color/missing',
      },
    },
  };
  await writeFile(file, JSON.stringify(document), 'utf8');

  await assert.rejects(
    () => readDtifTokensFile(file),
    (err: unknown) => {
      assert.ok(err instanceof DtifTokenParseError);
      assert.strictEqual(err.source, file);
      assert.match(err.format(), /#\/color\/missing/);
      return true;
    },
  );
});

void test('readDtifTokensFile attaches flattened DTIF tokens', async () => {
  const file = fileURLToPath(
    new URL('../fixtures/dtif/data-model.tokens.json', import.meta.url),
  );
  const document = await readDtifTokensFile(file);
  const flattened = getDtifFlattenedTokens(document);
  assert(flattened);
  assert.ok(
    flattened.some((token) => token.pointer === '#/color/button/background'),
  );
});
