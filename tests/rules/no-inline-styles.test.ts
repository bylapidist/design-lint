import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

void test('design-system/no-inline-styles does not flag components by default', async () => {
  const linter = initLinter(
    {
      rules: { 'design-system/no-inline-styles': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/no-inline-styles flags style attribute on configured components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': ['error', { components: ['Button'] }],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles flags className attribute on configured components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': ['error', { components: ['Button'] }],
      },
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
  const linter = initLinter(
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

void test('design-system/no-inline-styles keeps ignoreClassName behavior with targeted components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { ignoreClassName: true, components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <Button className="foo" style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('style'));
});

void test('design-system/no-inline-styles flags inline styles in Vue templates', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': ['error', { components: ['Button'] }],
      },
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
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': ['error', { components: ['Button'] }],
      },
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
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { components: ['my-button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <my-button style="color:red"></my-button>;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/no-inline-styles targets components by import origin', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { importOrigins: ['@acme/design-system'] },
        ],
      },
    },
    new FileSource(),
  );

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lint-'));
  const sourceId = path.join(dir, 'file.tsx');
  const moduleDeclId = path.join(dir, 'types.d.ts');
  const sourceText = [
    "import { Button } from '@acme/design-system';",
    "import { Panel } from '@third-party/ui';",
    'const a = <><Button style={{ color: "red" }} /><Panel style={{ color: "red" }} /></>;',
  ].join('\n');

  fs.writeFileSync(sourceId, sourceText);
  fs.writeFileSync(
    moduleDeclId,
    [
      "declare module '@acme/design-system' { export const Button: () => unknown; }",
      "declare module '@third-party/ui' { export const Panel: () => unknown; }",
    ].join('\n'),
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
    assert(results[0].messages.length <= 1);
    if (results[0].messages[0]) {
      assert.ok(results[0].messages[0].message.includes('Button'));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('design-system/no-inline-styles resolves import origin from AST fallback for default imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { importOrigins: ['@acme/design-system'] },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    [
      "import Button from '@acme/design-system';",
      "import Panel from '@third-party/ui';",
      'const a = <><Button style={{ color: "red" }} /><Panel style={{ color: "red" }} /></>;',
    ].join('\n'),
    'file.tsx',
  );

  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Button'));
});

void test('design-system/no-inline-styles resolves import origin from AST fallback for named imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { importOrigins: ['@acme/design-system'] },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    [
      "import { Button } from '@acme/design-system';",
      "import { Panel } from '@third-party/ui';",
      'const a = <><Button style={{ color: "red" }} /><Panel style={{ color: "red" }} /></>;',
    ].join('\n'),
    'file.tsx',
  );

  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Button'));
});

void test('design-system/no-inline-styles resolves import origin from AST fallback for aliased named imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { importOrigins: ['@acme/design-system'] },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    [
      "import { Button as DSButton } from '@acme/design-system';",
      "import { Panel as ThirdPanel } from '@third-party/ui';",
      'const a = <><DSButton style={{ color: "red" }} /><ThirdPanel style={{ color: "red" }} /></>;',
    ].join('\n'),
    'file.tsx',
  );

  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

void test('design-system/no-inline-styles resolves import origin from AST fallback for namespace member usage', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/no-inline-styles': [
          'error',
          { importOrigins: ['@acme/design-system'] },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    [
      "import * as DS from '@acme/design-system';",
      "import * as Third from '@third-party/ui';",
      'const a = <><DS.Button style={{ color: "red" }} /><Third.Panel style={{ color: "red" }} /></>;',
    ].join('\n'),
    'file.tsx',
  );

  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DS.Button'));
});
