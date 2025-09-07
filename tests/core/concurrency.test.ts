import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Linter } from '../../src/index.ts';

// Ensure lintFiles works when concurrency is 0 or negative
// by falling back to a minimum concurrency of 1.
void test('lintFiles handles non-positive concurrency values', async () => {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
  const file = path.join(dir, 'test.css');
  await fs.writeFile(file, 'a{color:red}');
  const linter = new Linter({ concurrency: 0 });
  const res = await linter.lintFiles([file]);
  assert.equal(res.results[0]?.filePath, file);
  await fs.rm(dir, { recursive: true, force: true });
});
