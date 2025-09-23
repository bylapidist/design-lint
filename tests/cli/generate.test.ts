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

void test('generate command writes configured outputs', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
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
      output: [
        { format: 'css', file: 'tokens.css', nameTransform: 'kebab-case' },
        { format: 'js', file: 'tokens.js', nameTransform: 'kebab-case' },
        { format: 'ts', file: 'tokens.d.ts', nameTransform: 'kebab-case' },
      ],
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'generate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  const css = fs.readFileSync(path.join(dir, 'tokens.css'), 'utf8');
  assert.match(css, /--color-red/);
  assert.match(css, /rgb\(255, 0, 0\)/);
  const js = fs.readFileSync(path.join(dir, 'tokens.js'), 'utf8');
  assert.match(js, /export const COLOR_RED/);
  assert.match(js, /"rgb\(255, 0, 0\)"/);
  const ts = fs.readFileSync(path.join(dir, 'tokens.d.ts'), 'utf8');
  assert.match(ts, /COLOR_RED/);
  assert.match(ts, /"rgb\(255, 0, 0\)"/);
});
