/**
 * Tests for the `design-lint tokens` command.
 *
 * Calls `exportTokens` directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { exportTokens } from '../../src/cli/tokens.js';
import type { DtifFlattenedToken } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = path.join(
    tmpdir(),
    `dl-tokens-${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTokensFile(dir: string, name: string, data: unknown): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(data));
  return p;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('exportTokens exports resolved tokens with extensions', async () => {
  const dir = makeTmpDir();
  writeTokensFile(dir, 'base.tokens.json', {
    $version: '1.0.0',
    color: {
      blue: { $type: 'color', $ref: '#/color/red' },
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $extensions: { 'vendor.ext': { foo: 'bar' } },
      },
    },
  });
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './base.tokens.json' }, rules: {} }),
  );
  const outPath = path.join(dir, 'out.json');

  await exportTokens({ config: configPath, out: outPath });

  const out = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<
    string,
    Record<string, DtifFlattenedToken>
  >;
  const red = out.default['#/color/red'];
  const redValue = red.value as { colorSpace: string; components: number[] };
  assert.equal(red.pointer, '#/color/red');
  assert.equal(redValue.colorSpace, 'srgb');
  assert.deepEqual(redValue.components, [1, 0, 0]);
  assert.deepEqual(red.metadata.extensions, { 'vendor.ext': { foo: 'bar' } });

  const blue = out.default['#/color/blue'];
  const blueValue = blue.value as { colorSpace: string; components: number[] };
  assert.equal(blueValue.colorSpace, 'srgb');
  assert.deepEqual(blueValue.components, [1, 0, 0]);
});

void test('exportTokens resolves config from an absolute path outside cwd', async () => {
  const dir = makeTmpDir();
  writeTokensFile(dir, 'base.tokens.json', {
    $version: '1.0.0',
    color: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  });
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './base.tokens.json' }, rules: {} }),
  );
  const outPath = path.join(dir, 'out.json');

  await exportTokens({ config: configPath, out: outPath });

  const out = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<
    string,
    Record<string, DtifFlattenedToken>
  >;
  const redValue = out.default['#/color/red'].value as {
    colorSpace: string;
    components: number[];
  };
  assert.equal(redValue.colorSpace, 'srgb');
  assert.deepEqual(redValue.components, [1, 0, 0]);
});

void test('exportTokens exports multiple themes', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        light: {
          $version: '1.0.0',
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [1, 1, 1] },
          },
        },
        dark: {
          $version: '1.0.0',
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          },
        },
      },
      rules: {},
    }),
  );

  const lines: string[] = [];
  const orig = console.log;
  console.log = (v: unknown) => {
    lines.push(String(v));
  };
  try {
    await exportTokens({ config: configPath });
  } finally {
    console.log = orig;
  }

  const out = JSON.parse(lines.join('')) as Record<
    string,
    Record<string, DtifFlattenedToken>
  >;
  const lightValue = out.light['#/primary'].value as {
    colorSpace: string;
    components: number[];
  };
  assert.equal(lightValue.colorSpace, 'srgb');
  assert.deepEqual(lightValue.components, [1, 1, 1]);

  const darkValue = out.dark['#/primary'].value as {
    colorSpace: string;
    components: number[];
  };
  assert.deepEqual(darkValue.components, [0, 0, 0]);
});

void test('exportTokens throws on unknown theme', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        default: {
          $version: '1.0.0',
          color: {
            red: {
              $type: 'color',
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
            },
          },
        },
      },
      rules: {},
    }),
  );

  await assert.rejects(
    () => exportTokens({ config: configPath, theme: 'missing' }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Unknown theme "missing"'));
      return true;
    },
  );
});
