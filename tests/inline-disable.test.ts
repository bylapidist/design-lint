import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/utils/tmp.ts';
import { Linter } from '../src/core/linter.ts';

test('inline directives disable linting', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(
    file,
    "const a = 'old';\n" +
      '// design-lint-disable-next-line\n' +
      "const b = 'old';\n" +
      '/* design-lint-disable */\n' +
      "const c = 'old';\n" +
      "const d = 'old';\n" +
      '/* design-lint-enable */\n' +
      "const e = 'old';\n",
  );
  const linter = new Linter({
    tokens: { deprecations: { old: { replacement: 'new' } } },
    rules: { 'design-system/deprecation': 'error' },
  });
  const res = await linter.lintFile(file);
  const lines = res.messages.map((m) => m.line).sort();
  assert.deepEqual(lines, [1, 8]);
});
