import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/core/file-source.ts';

void test('design-system/no-inline-styles flags style attribute on components', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles flags className attribute on components', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button className="foo" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles ignores className when configured', async () => {
  const linter = new Linter(
    {
      rules: {
        'design-system/no-inline-styles': ['error', { ignoreClassName: true }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button className="foo" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/no-inline-styles flags inline styles in Vue templates', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '<template><Button style="color:red" /></template>',
    'file.vue',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles flags inline styles in Svelte components', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '<Button style="color:red" />',
    'file.svelte',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles flags inline styles on custom elements', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <my-button style="color:red"></my-button>;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});
