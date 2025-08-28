import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {
  toPosix,
  relFrom,
  relFromCwd,
  realpathIfExists,
} from '../src/utils/paths';
import { makeTmpDir } from '../src/utils/tmp';

test('toPosix converts separators', () => {
  assert.equal(toPosix('a\\b\\c'), 'a/b/c');
});

test('relFromCwd produces posix paths', () => {
  const p = path.join(process.cwd(), 'a', 'b');
  assert.equal(relFromCwd(p), 'a/b');
});

test('relFrom handles empty path', () => {
  assert.equal(relFrom(process.cwd(), ''), '.');
});

test('realpathIfExists resolves paths', () => {
  const tmp = makeTmpDir();
  const rp = realpathIfExists(tmp);
  assert.equal(rp, fs.realpathSync(tmp));
});
