import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.fix));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <DSButton></DSButton>;');
});
