import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { applyFixes } from '../../src/index.js';

void test('design-system/component-usage suggests substitutions', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { button: 'DSButton' } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = <button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

void test('design-system/component-usage matches mixed-case tags', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { button: 'DSButton' } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = <Button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

void test('design-system/component-usage matches mixed-case substitution keys', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { Button: 'DSButton' } },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText('const a = <button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

void test('design-system/component-usage fixes self-closing tags', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { button: 'DSButton' } },
        ],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <button/>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].fix);
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <DSButton/>;');
});

void test('design-system/component-usage fixes opening and closing tags', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { button: 'DSButton' } },
        ],
      },
    },
    new FileSource(),
  );
  const code = 'const a = <button></button>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].fix);
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <DSButton></button>;');
});

void test('design-system/component-usage reports paired tags once', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { div: 'Box' } },
        ],
      },
    },
    new FileSource(),
  );

  const res = await linter.lintText(
    'const a = <div>content</div>;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/component-usage resolves aliased JSX components using TypeScript metadata', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/component-usage': [
          'error',
          { substitutions: { Button: 'DSButton' } },
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
    'const a = <LegacyButton />;',
  ].join('\n');
  fs.writeFileSync(sourceId, sourceText);
  fs.writeFileSync(
    moduleDeclId,
    "declare module '@legacy/ui' { export const Button: () => unknown; }",
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
    assert.ok(results[0].messages[0].message.includes('DSButton'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
