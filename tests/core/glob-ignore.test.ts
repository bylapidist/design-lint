import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FileService } from '../../src/core/file-service.ts';
import { makeTmpDir } from '../../src/utils/tmp.ts';
import type { Config } from '../../src/core/linter.ts';

test('FileService.scan applies nested ignore files for glob targets', async () => {
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
    const files = await FileService.scan(['**/*.ts'], config);
    const rels = files.map((f) => path.relative(dir, f)).sort();
    assert.deepEqual(rels, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});
