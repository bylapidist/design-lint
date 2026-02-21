import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { createNodeEnvironment } from '../../src/adapters/node/environment.js';
import { getDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';

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

void test('inline DTIF tokens attach flattened cache for reuse', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.1, 0.2, 0.3],
        },
      },
    },
  } as const;

  const config = { tokens, rules: {} };
  const env = createNodeEnvironment(config);
  const linter = initLinter(config, env);

  await linter.lintText('a { color: #000; }', 'inline.css');

  const flattened = getDtifFlattenedTokens(tokens);
  assert(flattened, 'expected flattened DTIF tokens to be cached');
  const [first] = flattened;
  assert(first);
  assert.equal(first.pointer, '#/color/primary');
});

void test('unsupported file types produce parse-error diagnostics', async () => {
  const config = { tokens: {}, rules: {} };
  const env = createNodeEnvironment(config);
  const linter = initLinter(config, env);
  const res = await linter.lintText('<div/>', 'index.html');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0]?.ruleId, 'parse-error');
  assert.match(res.messages[0]?.message ?? '', /Unsupported file type/);
});
