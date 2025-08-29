import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-token/colors reports disallowed hex', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "#AaBbCc";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'design-token/colors');
});

test('design-token/colors ignores hex case', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#FFFFFF' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "#ffffff";', 'file.ts');
  assert.equal(res.messages.length, 0);
});

test('design-token/colors ignores invalid hex lengths', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#fff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "#12345";', 'file.ts');
  assert.equal(res.messages.length, 0);
});

test('design-token/colors reports disallowed rgb', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "rgb(0, 0, 0)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed rgba', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "rgba(0,0,0,0.5)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed hsl', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "hsl(0, 0%, 0%)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed hsla', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText(
    'const c = "hsla(0, 0%, 0%, 0.5)";',
    'file.ts',
  );
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed named color', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "red";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports various named colors', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText(
    'const a = "papayawhip"; const b = "rebeccapurple";',
    'file.ts',
  );
  assert.equal(res.messages.length, 2);
});

test('design-token/colors allows configured formats', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': ['error', { allow: ['named'] }] },
  });
  const res = await linter.lintText('const c = "red";', 'file.ts');
  assert.equal(res.messages.length, 0);
});

test('design-token/colors handles gradients', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const css = `.a{\n  background: linear-gradient(\n    #ffffff,\n    #000000\n  );\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/colors': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.colors'));
});
