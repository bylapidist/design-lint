import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp.ts';

test('makeTmpDir creates a temporary directory', () => {
  const dir = makeTmpDir('test-');
  assert.ok(fs.existsSync(dir));
  fs.rmSync(dir, { recursive: true, force: true });
});
