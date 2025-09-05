import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp.ts';

test('makeTmpDir falls back when native realpath missing', () => {
  const native = fs.realpathSync.native;
  Object.defineProperty(fs.realpathSync, 'native', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  const dir = makeTmpDir('test-');
  assert.ok(fs.existsSync(dir));
  fs.rmSync(dir, { recursive: true, force: true });
  Object.defineProperty(fs.realpathSync, 'native', {
    value: native,
    configurable: true,
    writable: true,
  });
});
