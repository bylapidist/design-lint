import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';

void test('Linter integrates registry, parser and trackers', async () => {
  const linter = new Linter(
    {
      tokens: {},
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'linter-int-'));
  const file = path.join(dir, 'file.css');
  await fs.writeFile(file, 'a{color:#fff;}');
  const res = await linter.lintFile(file);
  assert.equal(res.messages.length, 1);
});
