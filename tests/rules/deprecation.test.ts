import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ensureDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';

void test('design-system/deprecation flags deprecated token', async () => {
  const tokens = {
    $version: '1.0.0',
    colors: {
      old: {
        $type: 'string',
        $value: 'colors.old',
        $deprecated: { $replacement: '#/colors/new' },
      },
      new: { $type: 'string', $value: 'colors.new' },
    },
  };
  await ensureDtifFlattenedTokens(tokens, {
    uri: 'memory://tests/deprecation/default.json',
  });
  const linter = initLinter(
    {
      tokens,
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
  const tokens = {
    $version: '1.0.0',
    colors: {
      old: {
        $type: 'string',
        $value: 'colors.old',
        $deprecated: { $replacement: '#/colors/new' },
      },
      new: { $type: 'string', $value: 'colors.new' },
    },
  };
  await ensureDtifFlattenedTokens(tokens, {
    uri: 'memory://tests/deprecation/default.json',
  });
  const linter = initLinter(
    {
      tokens,
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
