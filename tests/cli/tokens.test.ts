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
        $value: '{color.red}',
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
    Record<string, { $value: unknown; $extensions?: unknown }>
  >;
  assert.equal(out.default['color.red'].$value, '#ff0000');
  assert.deepEqual(out.default['color.red'].$extensions, {
    'vendor.ext': { foo: 'bar' },
  });
  assert.equal(out.default['color.blue'].$value, '#ff0000');
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
    Record<string, { $value: unknown }>
  >;
  assert.equal(out.default['color.red'].$value, '#ff0000');
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
    Record<string, { $value: unknown }>
  >;
  assert.equal(out.light.primary.$value, '#fff');
  assert.equal(out.dark.primary.$value, '#000');
});
