import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../packages/core/src/core/linter.ts';
import { FileSource } from '../../packages/core/src/core/file-source.ts';
import { applyFixes } from '../../packages/core/src/index.ts';

void test('design-system/icon-usage reports raw svg', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/icon-usage': 'error' },
    },
    new FileSource(),
  );
  const code = 'const a = <svg/>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Icon'));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <Icon/>;');
});

void test('design-system/icon-usage matches substitutions', async () => {
  const linter = new Linter(
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
  const code = 'const a = <FooIcon></FooIcon>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.message.includes('Icon')));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <Icon></Icon>;');
});

void test('design-system/icon-usage fixes svg opening and closing tags', async () => {
  const linter = new Linter(
    {
      rules: { 'design-system/icon-usage': 'error' },
    },
    new FileSource(),
  );
  const code = 'const a = <svg></svg>;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 2);
  assert.ok(res.messages.every((m) => m.fix));
  const fixed = applyFixes(code, res.messages);
  assert.equal(fixed, 'const a = <Icon></Icon>;');
});
