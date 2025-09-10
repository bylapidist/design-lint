import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

const tokens = {
  fontSizes: {
    $type: 'dimension',
    sm: { $value: '16px' },
    md: { $value: '32px' },
  },
};

void test('suggests closest token name', async () => {
  const linter = new Linter(
    { tokens, rules: { 'design-token/font-size': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
  const res = await linter.lintText('a{font-size:18px;}', 'a.css');
  assert.equal(res.messages[0]?.suggest, undefined);
});
