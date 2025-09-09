import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/node/file-source.ts';

const rule = { 'design-token/colors': 'error' };

void test('accepts CSS variables matching string patterns', async () => {
  const linter = new Linter(
    {
      tokens: { colors: ['--colour-*'] },
      rules: rule,
    },
    new FileSource(),
  );
  const res = await linter.lintText('a{color:var(--colour-primary);}', 'x.css');
  assert.equal(res.messages.length, 0);
});

void test('reports variables not matching patterns', async () => {
  const linter = new Linter(
    {
      tokens: { colors: ['--colour-*'] },
      rules: rule,
    },
    new FileSource(),
  );
  const res2 = await linter.lintText('a{color:var(--other);}', 'x.css');
  assert.equal(res2.messages[0]?.message, 'Unexpected color var(--other)');
});

void test('supports regex token patterns', async () => {
  const linter = new Linter(
    { tokens: { colors: [/^--brand-/] }, rules: rule },
    new FileSource(),
  );
  const res3 = await linter.lintText('a{color:var(--brand-primary);}', 'x.css');
  assert.equal(res3.messages.length, 0);
});
