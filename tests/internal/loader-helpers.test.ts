import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/utils/tmp.ts';
import {
  _findConfig,
  _isESM,
  _loadEsmConfig,
} from '../../src/config/loader.ts';

test('_findConfig returns undefined when no file', async () => {
  const tmp = makeTmpDir();
  const found = await _findConfig(tmp);
  assert.equal(found, undefined);
});

test('_findConfig locates config in parent', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.js'),
    'module.exports = {};',
  );
  const nested = path.join(tmp, 'a');
  fs.mkdirSync(nested);
  const found = await _findConfig(nested);
  assert.equal(path.basename(found ?? ''), 'designlint.config.js');
});

test('_isESM detects package type module', () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const file = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(file, '');
  assert.equal(_isESM(file), true);
});

test('_isESM returns false for cjs extension', () => {
  const tmp = makeTmpDir();
  const file = path.join(tmp, 'designlint.config.cjs');
  fs.writeFileSync(file, '');
  assert.equal(_isESM(file), false);
});

test('_isESM handles invalid package.json', () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(path.join(tmp, 'package.json'), '{');
  const file = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(file, '');
  assert.equal(_isESM(file), false);
});

test('_loadEsmConfig imports module', async () => {
  const tmp = makeTmpDir();
  const file = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(file, 'export default { value: 1 };');
  const mod = await _loadEsmConfig(file);
  assert.deepEqual(mod, { value: 1 });
});
