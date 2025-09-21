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

void test('tokens command exports resolved tokens with extensions', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  const tokens = {
    color: {
      red: {
        $type: 'color',
        $value: '#ff0000',
        $extensions: { 'vendor.ext': { foo: 'bar' } },
      },
      blue: {
        $type: 'color',
        $ref: '#/color/red',
      },
    },
  };
  fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './base.tokens.json' }, rules: {} }),
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
  assert.equal(res.status, 0);
  const out = JSON.parse(
    fs.readFileSync(path.join(dir, 'out.json'), 'utf8'),
  ) as Record<
    string,
    Record<
      string,
      { path: string; pointer: string; value: unknown; extensions?: unknown }
    >
  >;
  const red = out.default['#/color/red'];
  assert(red);
  assert.equal(red.value, '#ff0000');
  assert.equal(red.path, 'color.red');
  assert.equal(red.pointer, '#/color/red');
  assert.deepEqual(red.extensions, {
    'vendor.ext': { foo: 'bar' },
  });
  const blue = out.default['#/color/blue'];
  assert(blue);
  assert.equal(blue.value, '#ff0000');
  assert.equal(blue.path, 'color.blue');
  assert.equal(blue.pointer, '#/color/blue');
});

void test('tokens command reads config from outside cwd', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  const tokens = { color: { red: { $type: 'color', $value: '#ff0000' } } };
  fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './base.tokens.json' }, rules: {} }),
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
    Record<string, { value: unknown; path: string; pointer: string }>
  >;
  const red = out.default['#/color/red'];
  assert(red);
  assert.equal(red.value, '#ff0000');
  assert.equal(red.path, 'color.red');
  assert.equal(red.pointer, '#/color/red');
});

void test('tokens command exports themes with root tokens', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const tokens = {
    light: { primary: { $type: 'color', $value: '#fff' } },
    dark: { primary: { $type: 'color', $value: '#000' } },
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
    Record<string, { value: unknown; path: string; pointer: string }>
  >;
  assert.equal(out.light['#/primary'].value, '#fff');
  assert.equal(out.light['#/primary'].path, 'primary');
  assert.equal(out.light['#/primary'].pointer, '#/primary');
  assert.equal(out.dark['#/primary'].value, '#000');
  assert.equal(out.dark['#/primary'].path, 'primary');
  assert.equal(out.dark['#/primary'].pointer, '#/primary');
});
