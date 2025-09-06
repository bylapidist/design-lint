import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/border-radius reports invalid value', async () => {
  const linter = new Linter({
    tokens: { borderRadius: { sm: 2, md: 4 } },
    rules: { 'design-token/border-radius': 'error' },
  });
  const res = await linter.lintText('.a{border-radius:3px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/border-radius accepts valid values', async () => {
  const linter = new Linter({
    tokens: { borderRadius: { sm: 2, md: 4 } },
    rules: { 'design-token/border-radius': 'error' },
  });
  const css = '.a{border-radius:4px;} .b{border-radius:2px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/border-radius reports numeric literals', async () => {
  const linter = new Linter({
    tokens: { borderRadius: { sm: 2, md: 4 } },
    rules: { 'design-token/border-radius': 'error' },
  });
  const res = await linter.lintText('const r = 3;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/border-radius ignores numbers in JSX props', async () => {
  const linter = new Linter({
    tokens: { borderRadius: { sm: 2, md: 4 } },
    rules: { 'design-token/border-radius': 'error' },
  });
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

test('design-token/border-radius warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/border-radius': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('borderRadius'));
});
