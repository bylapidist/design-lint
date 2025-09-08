import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';
import { applyFixes } from '../../src/index.ts';

void test('design-system/component-prefix enforces prefix on components', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = <Button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DS'));
});

void test('design-system/component-prefix ignores lowercase tags', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = <div/>;', 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-system/component-prefix fixes self-closing tags', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <Button/>';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].fix);
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <DSButton/>');
});

void test('design-system/component-prefix fixes opening and closing tags', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <Button></Button>';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.fix));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <DSButton></DSButton>');
});

void test('design-system/component-prefix enforces prefix in Vue components', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '<template><Button/></template>',
    'file.vue',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/component-prefix enforces prefix in Svelte components', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('<Button/>', 'file.svelte');
  assert.equal(res.messages.length, 1);
});

void test('design-system/component-prefix enforces prefix on custom elements', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'ds-' }],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <my-button></my-button>';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <ds-my-button></ds-my-button>');
});
