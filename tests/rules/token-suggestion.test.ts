import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';
import { createDtifTheme } from '../helpers/dtif.js';

const tokens = createDtifTheme({
  'fontSizes.sm': { type: 'dimension', value: { value: 16, unit: 'px' } },
  'fontSizes.md': { type: 'dimension', value: { value: 32, unit: 'px' } },
});

void test('suggests closest token name', async () => {
  const linter = initLinter(
    { tokens, rules: { 'design-token/font-size': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(tokens),
    },
  );
  const res = await linter.lintText('a{font-size:18px;}', 'a.css');
  assert.equal(res.messages[0]?.suggest, undefined);
});
