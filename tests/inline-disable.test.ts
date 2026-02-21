import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';

const tokens = {
  $version: '1.0.0',
  old: {
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [0, 0, 0] },
    $deprecated: { $replacement: '#/new' },
  },
  new: {
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [1, 1, 1] },
  },
};

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
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = initLinter(
      { tokens, rules: { 'design-system/deprecation': 'error' } },
      new FileSource(),
    );
    const { results } = await linter.lintTargets([file]);
    const res = results[0];
    const lines = res.messages.map((m) => m.line).sort();
    assert.deepEqual(lines, [1, 9]);
  } finally {
    process.chdir(cwd);
  }
});

void test('strings resembling directives do not disable next line', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(
    file,
    "const a = 'design-lint-disable-next-line';\n" + "const b = 'old';\n",
  );
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = initLinter(
      { tokens, rules: { 'design-system/deprecation': 'error' } },
      new FileSource(),
    );
    const { results } = await linter.lintTargets([file]);
    const res = results[0];
    assert.equal(res.messages.length, 1);
    assert.equal(res.messages[0].line, 2);
  } finally {
    process.chdir(cwd);
  }
});

void test('rule-scoped inline directives only disable matching rules', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.css');
  fs.writeFileSync(
    file,
    '/* design-lint-disable-next-line design-token/colors */\n' +
      'a { color: #00ff00; margin: 3px; }\n',
  );
  const ruleTokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
    spacing: {
      md: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
    },
  };
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = initLinter(
      {
        tokens: ruleTokens,
        rules: {
          'design-token/colors': 'error',
          'design-token/spacing': 'error',
        },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets([file]);
    const messages = results[0]?.messages ?? [];
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.ruleId, 'design-token/spacing');
  } finally {
    process.chdir(cwd);
  }
});
