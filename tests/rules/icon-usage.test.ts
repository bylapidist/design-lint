import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { applyFixes } from '../../src/index.js';

void test('design-system/icon-usage reports raw svg', async () => {
  const linter = initLinter(
    {
      rules: { 'design-system/icon-usage': 'error' },
    },
    new FileSource(),
  );
  const code = 'const a = <svg/>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Icon'));
  assert.equal(res.messages[0].fix, undefined);
});

void test('design-system/icon-usage applies fix when replacement is in scope', async () => {
  const linter = initLinter(
    {
      rules: { 'design-system/icon-usage': 'error' },
    },
    new FileSource(),
  );
  const code = 'import { Icon } from "./icons";\nconst a = <svg/>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].fix);
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'import { Icon } from "./icons";\nconst a = <Icon/>;');
});

void test('design-system/icon-usage matches substitutions', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/icon-usage': [
          'error',
          { substitutions: { fooicon: 'Icon' } },
        ],
      },
    },
    new FileSource(),
  );
  const code =
    'import { Icon } from "./icons";\nconst a = <FooIcon></FooIcon>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.message.includes('Icon')));
  const fixed = applyFixes(code, res.messages);
  assert.equal(
    fixed,
    'import { Icon } from "./icons";\nconst a = <Icon></Icon>;',
  );
});

void test('design-system/icon-usage fixes svg opening and closing tags', async () => {
  const linter = initLinter(
    {
      rules: { 'design-system/icon-usage': 'error' },
    },
    new FileSource(),
  );
  const code = 'import { Icon } from "./icons";\nconst a = <svg></svg>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.fix));
  const fixed = applyFixes(code, res.messages);
  assert.equal(
    fixed,
    'import { Icon } from "./icons";\nconst a = <Icon></Icon>;',
  );
});
