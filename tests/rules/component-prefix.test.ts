import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { applyFixes } from '../../src/index.js';

void test('design-system/component-prefix enforces prefix on components', async () => {
  const linter = initLinter(
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
  const linter = initLinter(
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
  const linter = initLinter(
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
  const linter = initLinter(
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
  const linter = initLinter(
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
  const linter = initLinter(
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
  const linter = initLinter(
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

void test('design-system/component-prefix preserves kebab-case custom element prefixes', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'ds' }],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <my-button></my-button>';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.fix));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <ds-my-button></ds-my-button>');
});

void test('design-system/component-prefix does not double-prefix prefixed tags', async () => {
  const pascalLinter = initLinter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const pascalRes = await pascalLinter.lintText(
    'const a = <DSButton/>;',
    'file.tsx',
  );
  assert.equal(pascalRes.messages.length, 0);

  const customLinter = initLinter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'ds-' }],
      },
    },
    new FileSource(),
  );
  const customRes = await customLinter.lintText(
    'const b = <ds-my-button/>;',
    'file.tsx',
  );
  assert.equal(customRes.messages.length, 0);
});

void test('design-system/component-prefix reports JSX member expressions without autofix', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-prefix': ['error', { prefix: 'DS' }],
      },
    },
    new FileSource(),
  );
  const uiMemberRes = await linter.lintText(
    'const a = <UI.Button />;',
    'file.tsx',
  );
  assert.equal(uiMemberRes.messages.length, 1);
  assert.equal(uiMemberRes.messages[0].fix, undefined);

  const fooMemberRes = await linter.lintText(
    'const a = <Foo.Bar></Foo.Bar>;',
    'file.tsx',
  );
  assert.equal(fooMemberRes.messages.length, 2);
  assert.ok(fooMemberRes.messages.every((m) => m.fix === undefined));
});

void test('design-system/component-prefix ignores non-scoped imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-prefix': [
          'error',
          {
            prefix: 'DS',
            packages: ['@acme/design-system'],
            components: ['Button'],
          },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    "import { Button } from '@acme/legacy-ui'; const a = <Button/>;",
    'component-prefix-unscoped.tsx',
  );

  assert.equal(res.messages.length, 0);
});

void test('design-system/component-prefix enforces scoped design-system imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-prefix': [
          'error',
          {
            prefix: 'DS',
            packages: ['@acme/design-system'],
            components: ['Button'],
          },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    "import { Button } from '@acme/design-system'; const a = <Button/>;",
    'component-prefix-scoped.tsx',
  );

  assert.equal(res.messages.length, 1);
  assert.ok(
    res.messages[0].message.includes('Component "Button" should be prefixed'),
  );
});
