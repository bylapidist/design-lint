import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');
const __dirname = path.dirname(new URL(import.meta.url).pathname);

interface ExportedToken {
  value: unknown;
  type?: string;
  extensions?: unknown;
  description?: string;
  deprecated?: unknown;
  loc?: unknown;
  aliases?: string[];
  ref?: string;
  candidates?: { value: unknown; ref?: string }[];
  overrides?: {
    source: string;
    when: Record<string, unknown>;
    value?: unknown;
    ref?: string;
    fallback?: { value: unknown; ref?: string }[];
  }[];
}

type ExportedThemes = Record<string, Record<string, ExportedToken>>;

void test('tokens command exports DTIF metadata for resolved tokens', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.dtif.json');
  const tokens = {
    palette: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $extensions: { 'vendor.ext': { foo: 'bar' } },
      },
      blue: {
        $type: 'color',
        $value: [
          { $ref: '#/palette/red' },
          { colorSpace: 'srgb', components: [0, 0, 1] },
        ],
      },
      accent: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 1, 0] },
      },
    },
    $overrides: [
      {
        $token: '#/palette/accent',
        $when: { mode: 'dark' },
        $ref: '#/palette/red',
        $fallback: [
          { $value: { colorSpace: 'srgb', components: [0, 0.5, 0] } },
          { $ref: '#/palette/blue' },
        ],
      },
    ],
  };
  fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './base.dtif.json' }, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'tokens',
      '--out',
      'out.json',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(
    fs.readFileSync(path.join(dir, 'out.json'), 'utf8'),
  ) as ExportedThemes;

  const red = out.default['/palette/red'];
  const expectedRedValue = {
    colorSpace: 'srgb',
    components: [1, 0, 0],
  };
  assert.deepEqual(red.value, expectedRedValue);
  assert.equal(red.type, 'color');
  assert.deepEqual(red.extensions, { 'vendor.ext': { foo: 'bar' } });

  const blue = out.default['/palette/blue'];
  const expectedBlueFallback = {
    colorSpace: 'srgb',
    components: [0, 0, 1],
  };
  assert.deepEqual(blue.value, expectedRedValue);
  assert.equal(blue.type, 'color');
  assert.equal(blue.ref, '/palette/red');
  assert.deepEqual(blue.aliases, ['/palette/red']);
  assert.ok(Array.isArray(blue.candidates));
  assert.deepEqual(blue.candidates, [
    { value: expectedRedValue, ref: '/palette/red' },
    { value: expectedBlueFallback },
  ]);

  const accent = out.default['/palette/accent'];
  const expectedAccentValue = {
    colorSpace: 'srgb',
    components: [0, 1, 0],
  };
  const expectedAccentFallback = {
    colorSpace: 'srgb',
    components: [0, 0.5, 0],
  };
  assert.deepEqual(accent.value, expectedAccentValue);
  assert.equal(accent.type, 'color');
  assert.ok(Array.isArray(accent.overrides));
  assert.deepEqual(accent.overrides, [
    {
      source: '/$overrides/0',
      when: { mode: 'dark' },
      value: expectedRedValue,
      ref: '/palette/red',
      fallback: [
        { value: expectedAccentFallback },
        { value: expectedRedValue, ref: '/palette/blue' },
      ],
    },
  ]);
});

void test('tokens command reads config from outside cwd', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.dtif.json');
  const tokens = {
    palette: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  };
  fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './base.dtif.json' }, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const outPath = path.join(dir, 'out.json');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'tokens',
      '--out',
      outPath,
      '--config',
      configPath,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  const out = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<
    string,
    Record<string, { value: unknown }>
  >;
  assert.deepEqual(out.default['/palette/red'].value, {
    colorSpace: 'srgb',
    components: [1, 0, 0],
  });
});

void test('tokens command exports themes with root tokens', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const tokens = {
    light: {
      palette: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      palette: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  };
  fs.writeFileSync(configPath, JSON.stringify({ tokens, rules: {} }));
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'tokens',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout) as Record<
    string,
    Record<string, { value: unknown }>
  >;
  assert.deepEqual(out.light['/palette/primary'].value, {
    colorSpace: 'srgb',
    components: [1, 1, 1],
  });
  assert.deepEqual(out.dark['/palette/primary'].value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
});
