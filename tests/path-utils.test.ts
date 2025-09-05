import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {
  toPosix,
  relFrom,
  relFromCwd,
  realpathIfExists,
} from '../src/utils/paths.ts';
import { makeTmpDir } from '../src/utils/tmp.ts';

test('toPosix converts separators', () => {
  const input = path.join('a', 'b', 'c');
  assert.equal(toPosix(input), 'a/b/c');
});

test('relFromCwd produces posix paths', () => {
  const p = path.join(process.cwd(), 'a', 'b');
  assert.equal(relFromCwd(p), 'a/b');
});

test('relFrom handles empty path', () => {
  assert.equal(relFrom(process.cwd(), ''), '');
});

test('realpathIfExists resolves paths', () => {
  const tmp = makeTmpDir();
  const rp = realpathIfExists(tmp);
  assert.equal(rp, fs.realpathSync(tmp));
});

test('realpathIfExists falls back without native', () => {
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

test('realpathIfExists returns input when missing', () => {
  const missing = path.join(process.cwd(), 'no-such-file');
  assert.equal(realpathIfExists(missing), missing);
});
