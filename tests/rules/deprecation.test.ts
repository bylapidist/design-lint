import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/core/file-source.ts';

void test('design-system/deprecation flags deprecated token', async () => {
  const linter = new Linter(
    {
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = "old";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('new'));
  assert.deepEqual(res.messages[0].fix, {
    range: [10, 15],
    text: `'new'`,
  });
});

void test('design-system/deprecation ignores tokens in non-style jsx attributes', async () => {
  const linter = new Linter(
    {
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <div aria-label="old" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/deprecation warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/deprecation': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.deprecations'));
});
