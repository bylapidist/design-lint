import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';

void test('lintFiles expands glob patterns with globby', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.module.css'), '');
  fs.writeFileSync(path.join(dir, 'src', 'b.module.scss'), '');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter({ tokens: {}, rules: {} }, new FileSource());
    const { results, warning } = await linter.lintFiles([
      '**/*.module.{css,scss}',
    ]);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/a.module.css', 'src/b.module.scss']);
    assert.equal(warning, undefined);
  } finally {
    process.chdir(cwd);
  }
});
