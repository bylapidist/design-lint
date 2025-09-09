import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/utils/tmp.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/node/file-source.ts';

void test('inline directives disable linting', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(
    file,
    "const a = 'old';\n" +
      "const b = 'old'; // design-lint-disable-line\n" +
      '// design-lint-disable-next-line\n' +
      "const c = 'old';\n" +
      '/* design-lint-disable */\n' +
      "const d = 'old';\n" +
      "const e = 'old';\n" +
      '/* design-lint-enable */\n' +
      "const f = 'old';\n",
  );
  const linter = new Linter(
    {
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintFile(file);
  const lines = res.messages.map((m) => m.line).sort();
  assert.deepEqual(lines, [1, 9]);
});

void test('strings resembling directives do not disable next line', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(
    file,
    "const a = 'design-lint-disable-next-line';\n" + "const b = 'old';\n",
  );
  const linter = new Linter(
    {
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintFile(file);
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].line, 2);
});
