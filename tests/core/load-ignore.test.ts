import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/utils/tmp.ts';
import { loadIgnore } from '../../src/core/ignore.ts';

void test('loadIgnore returns defaults when files missing', async () => {
  const dir = makeTmpDir();
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { patterns } = await loadIgnore();
    assert.ok(patterns.includes('**/node_modules/**'));
  } finally {
    process.chdir(cwd);
  }
});

void test('loadIgnore merges patterns from files and extra paths', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'src/skip.ts');
  fs.writeFileSync(
    path.join(dir, '.designlintignore'),
    '!node_modules/**\ncustom',
  );
  const extra = path.join(dir, '.customignore');
  fs.writeFileSync(extra, 'extra.ts');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { patterns } = await loadIgnore(undefined, [extra]);
    assert.ok(patterns.includes('src/skip.ts'));
    assert.ok(patterns.includes('!node_modules/**'));
    assert.ok(patterns.includes('custom'));
    assert.ok(patterns.includes('extra.ts'));
  } finally {
    process.chdir(cwd);
  }
});
