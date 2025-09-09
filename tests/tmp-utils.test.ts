import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.ts';

void test('makeTmpDir creates a temporary directory', () => {
  const dir = makeTmpDir('test-');
  assert.ok(fs.existsSync(dir));
  fs.rmSync(dir, { recursive: true, force: true });
});
