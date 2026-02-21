import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

void test('design-system/variant-prop flags invalid variant', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button variant="danger" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('danger'));
});

void test('design-system/variant-prop allows valid variant', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button variant="primary" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/variant-prop flags string literals in expressions', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "const a = <Button variant={'danger'} />;",
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('danger'));
});

void test('design-system/variant-prop ignores dynamic expressions', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button variant={foo} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/variant-prop supports custom prop names', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { prop: 'tone', components: { Alert: ['info', 'error'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Alert tone="warn" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('warn'));
});

void test('design-system/variant-prop flags invalid variant in Vue components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '<template><Button variant="danger" /></template>',
    'file.vue',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/variant-prop flags invalid variant in Svelte components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '<Button variant="danger" />',
    'file.svelte',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/variant-prop flags invalid variant on custom elements', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { 'my-button': ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <my-button variant="danger" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/variant-prop resolves aliased JSX components using TypeScript metadata', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/variant-prop': [
          'error',
          { components: { Button: ['primary', 'secondary'] } },
        ],
      },
    },
    new FileSource(),
  );

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lint-'));
  const sourceId = path.join(dir, 'file.tsx');
  const moduleDeclId = path.join(dir, 'legacy-ui.d.ts');
  const sourceText = [
    "import { Button as LegacyButton } from '@legacy/ui';",
    'const a = <LegacyButton variant="danger" />;',
  ].join('\n');
  fs.writeFileSync(sourceId, sourceText);
  fs.writeFileSync(
    moduleDeclId,
    "declare module '@legacy/ui' { export const Button: (props: { variant?: string }) => unknown; }",
  );

  try {
    const program = ts.createProgram({
      rootNames: [sourceId, moduleDeclId],
      options: {
        jsx: ts.JsxEmit.Preserve,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      },
    });

    const { results } = await linter.lintDocuments([
      {
        id: sourceId,
        type: 'ts',
        metadata: { program },
        getText() {
          return Promise.resolve(sourceText);
        },
      },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0].messages.length, 1);
    assert.ok(results[0].messages[0].message.includes('danger'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
