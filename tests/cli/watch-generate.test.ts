import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';

const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');
const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function waitFor(check: () => boolean, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('timeout');
}

void test('watch mode regenerates token outputs', async (t) => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  const tokens = { color: { red: { $type: 'color', $value: '#ff0000' } } };
  fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './base.tokens.json' },
      rules: {},
      output: [
        { format: 'css', file: 'tokens.css', nameTransform: 'kebab-case' },
      ],
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const proc = spawn(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      '--watch',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, stdio: 'ignore' },
  );
  t.after(() => proc.kill());

  const cssPath = path.join(dir, 'tokens.css');
  await waitFor(() => fs.existsSync(cssPath));
  let css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /#ff0000/);

  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      color: { red: { $type: 'color', $value: '#00ff00' } },
    }),
  );

  await waitFor(() => {
    const content = fs.readFileSync(cssPath, 'utf8');
    return content.includes('#00ff00');
  });

  proc.kill();
  await new Promise((resolve) => proc.once('exit', resolve));
});
