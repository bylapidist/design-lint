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
const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('tokens command exports resolved tokens with extensions', () => {
  const dir = makeTmpDir();
  const config = {
    tokens: {
      default: {
        $version: '1.0.0',
        color: {
          red: {
            $type: 'color',
            $value: srgb([1, 0, 0]),
            $extensions: { 'vendor.ext': { foo: 'bar' } },
          },
          blue: {
            $type: 'color',
            $ref: '#/color/red',
          },
        },
      },
    },
    rules: {},
  } as const;
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify(config),
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
  ) as Record<string, Record<string, { value: unknown; extensions?: unknown }>>;
  assert.deepEqual(out.default['color.red'].value, srgb([1, 0, 0]));
  assert.deepEqual(out.default['color.red'].extensions, {
    'vendor.ext': { foo: 'bar' },
  });
  assert.deepEqual(out.default['color.blue'].value, srgb([1, 0, 0]));
});

void test('tokens command reads config from outside cwd', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const config = {
    tokens: {
      default: {
        $version: '1.0.0',
        color: { red: { $type: 'color', $value: srgb([1, 0, 0]) } },
      },
    },
    rules: {},
  } as const;
  fs.writeFileSync(configPath, JSON.stringify(config));
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
  assert.deepEqual(out.default['color.red'].value, srgb([1, 0, 0]));
});

void test('tokens command exports themes with root tokens', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const tokens = {
    light: {
      $version: '1.0.0',
      primary: { $type: 'color', $value: srgb([1, 1, 1]) },
    },
    dark: {
      $version: '1.0.0',
      primary: { $type: 'color', $value: srgb([0, 0, 0]) },
    },
  } as const;
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
  assert.deepEqual(out.light.primary.value, srgb([1, 1, 1]));
  assert.deepEqual(out.dark.primary.value, srgb([0, 0, 0]));
});
