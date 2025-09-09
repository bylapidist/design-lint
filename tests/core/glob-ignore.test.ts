import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.ts';
import type { Config } from '../../src/core/linter.ts';

void test('FileSource.scan applies nested ignore files for glob targets', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), '');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), '');
  fs.writeFileSync(path.join(dir, '.gitignore'), '');
  fs.writeFileSync(path.join(dir, 'src', '.gitignore'), 'skip.ts');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const config: Config = { tokens: {}, rules: {} };
    const docs = await new FileSource().scan(['**/*.ts'], config);
    const rels = docs.map((d) => path.relative(dir, d.id)).sort();
    assert.deepEqual(rels, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});
