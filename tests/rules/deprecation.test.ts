import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

void test('design-system/deprecation flags deprecated token', async () => {
  const linter = initLinter(
    {
      tokens: {
        colors: {
          old: {
            $type: 'color',
            $value: '#000',
            $deprecated: { $replacement: '#/colors/new' },
          },
          new: { $type: 'color', $value: '#fff' },
        },
      },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = "colors.old";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(
    res.messages[0].message,
    'Token colors.old is deprecated; use colors.new.',
  );
  assert.deepEqual(res.messages[0].fix, {
    range: [10, 22],
    text: `'colors.new'`,
  });
});

void test('design-system/deprecation falls back to pointer string for external replacements', async () => {
  const linter = initLinter(
    {
      tokens: {
        colors: {
          old: {
            $type: 'color',
            $value: '#000',
            $deprecated: { $replacement: 'tokens.json#/shared/new' },
          },
        },
      },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = "colors.old";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(
    res.messages[0].message,
    'Token colors.old is deprecated; use tokens.json#/shared/new.',
  );
  assert.equal(res.messages[0].fix, undefined);
  assert.equal(res.messages[0].suggest, undefined);
});

void test('design-system/deprecation ignores tokens in non-style jsx attributes', async () => {
  const linter = initLinter(
    {
      tokens: {
        colors: {
          old: {
            $type: 'color',
            $value: '#000',
            $deprecated: { $replacement: '#/colors/new' },
          },
          new: { $type: 'color', $value: '#fff' },
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

void test('design-system/deprecation warns when tokens missing', async () => {
  const linter = initLinter(
    {
      rules: { 'design-system/deprecation': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('$deprecated'));
});
