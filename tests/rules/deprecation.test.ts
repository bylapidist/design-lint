import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

void test('design-system/deprecation flags deprecated token', async () => {
  const linter = initLinter(
    {
      tokens: {
        $version: '1.0.0',
        colors: {
          old: {
            $type: 'string',
            $value: 'colors.old',
            $deprecated: { $replacement: '#/colors/new' },
          },
          new: { $type: 'string', $value: 'colors.new' },
        },
      },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = "colors.old";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Use colors.new'));
  assert.deepEqual(res.messages[0].fix, {
    range: [10, 22],
    text: `'colors.new'`,
  });
});

void test('design-system/deprecation ignores tokens in non-style jsx attributes', async () => {
  const linter = initLinter(
    {
      tokens: {
        $version: '1.0.0',
        colors: {
          old: {
            $type: 'string',
            $value: 'colors.old',
            $deprecated: { $replacement: '#/colors/new' },
          },
          new: { $type: 'string', $value: 'colors.new' },
        },
      },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <div aria-label="colors.old" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/deprecation returns no diagnostics without deprecated metadata', async () => {
  const linter = initLinter(
    {
      tokens: {
        $version: '1.0.0',
        colors: {
          old: {
            $type: 'string',
            $value: 'colors.old',
          },
        },
      },
      rules: { 'design-system/deprecation': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = "colors.old";', 'file.ts');
  assert.equal(res.messages.length, 0);
});
