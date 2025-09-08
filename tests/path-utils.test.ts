import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {
  toPosix,
  relFrom,
  relFromCwd,
  realpathIfExists,
} from '../packages/core/src/utils/paths.ts';
import { makeTmpDir } from '../packages/core/src/utils/tmp.ts';

void test('toPosix converts separators', () => {
  const input = path.join('a', 'b', 'c');
  assert.equal(toPosix(input), 'a/b/c');
});

void test('relFromCwd produces posix paths', () => {
  const p = path.join(process.cwd(), 'a', 'b');
  assert.equal(relFromCwd(p), 'a/b');
});

void test('relFrom handles empty path', () => {
  assert.equal(relFrom(process.cwd(), ''), '');
});

void test('relFrom returns empty path for differing roots', () => {
  const root = path.join(process.cwd(), 'foo');
  assert.equal(relFrom(root, ''), '');
});

void test('realpathIfExists resolves paths', () => {
  const tmp = makeTmpDir();
  const rp = realpathIfExists(tmp);
  assert.equal(rp, fs.realpathSync(tmp));
});

void test('realpathIfExists falls back without native', () => {
  const native = fs.realpathSync.native;
  Object.defineProperty(fs.realpathSync, 'native', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  const tmp = makeTmpDir();
  assert.equal(realpathIfExists(tmp), fs.realpathSync(tmp));
  Object.defineProperty(fs.realpathSync, 'native', {
    value: native,
    configurable: true,
    writable: true,
  });
});

void test('realpathIfExists returns input when missing', () => {
  const missing = path.join(process.cwd(), 'no-such-file');
  assert.equal(realpathIfExists(missing), missing);
});
