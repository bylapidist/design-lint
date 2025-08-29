import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { writeFileAtomic } from '../src/utils/atomicWrite.ts';
import { makeTmpDir } from '../src/utils/tmp.ts';

test('writeFileAtomic handles concurrent writes', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'test.txt');
  await Promise.all([
    writeFileAtomic(file, 'one'),
    writeFileAtomic(file, 'two'),
  ]);
  const content = await fs.readFile(file, 'utf8');
  assert(['one', 'two'].includes(content));
  const files = await fs.readdir(dir);
  assert.deepEqual(files, ['test.txt']);
  await fs.rm(dir, { recursive: true, force: true });
});

test('writeFileAtomic cleans up temp files on error', async () => {
  const dir = makeTmpDir();
  const targetDir = path.join(dir, 'subdir');
  await fs.mkdir(targetDir);
  let err: unknown;
  try {
    await writeFileAtomic(targetDir, 'data');
  } catch (e) {
    err = e;
  }
  assert(err instanceof Error);
  const files = await fs.readdir(dir);
  assert.deepEqual(files, ['subdir']);
  await fs.rm(dir, { recursive: true, force: true });
});
