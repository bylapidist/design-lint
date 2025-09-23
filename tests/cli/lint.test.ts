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

void test('lint command reports token color violations', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './base.tokens.json' },
      rules: { 'token-colors': 'error' },
    }),
  );
  fs.writeFileSync(path.join(dir, 'input.css'), 'a { color: #fff; }');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'input.css',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 1);
  assert.match(res.stdout, /input.css/);
});
