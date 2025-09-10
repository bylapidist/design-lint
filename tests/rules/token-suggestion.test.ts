import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';

void test('suggests closest token name', async () => {
  const linter = new Linter(
    {
      tokens: { fontSizes: ['--font-size-100', '--font-size-200'] },
      rules: { 'design-token/font-size': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'a{font-size:var(--font-size-10o);}',
    'a.css',
  );
  assert.equal(res.messages[0]?.suggest, '--font-size-100');
});
