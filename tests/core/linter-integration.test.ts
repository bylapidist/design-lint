import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.ts';
import { createNodeEnvironment } from '../../src/adapters/node/environment.ts';

void test('Linter integrates registry, parser and trackers', async () => {
  const config = {
    tokens: {},
    rules: { 'design-token/colors': 'error' },
  };
  const env = createNodeEnvironment(config);
  const linter = initLinter(config, env);
  const res = await linter.lintText('a{color:#fff;}', 'file.css');
  assert.equal(res.messages.length, 1);
});
