import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLinter as initLinter } from '../../src/index.ts';
import { createNodeEnvironment } from '../../src/adapters/node/environment.ts';

void test('Linter integrates registry, parser and trackers', async () => {
  const config = {
    tokens: {},
    rules: { 'design-token/colors': 'error' },
  };
  const env = createNodeEnvironment(config);
  const linter = initLinter(config, env);
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'linter-int-'));
  const file = path.join(dir, 'file.css');
  await fs.writeFile(file, 'a{color:#fff;}');
  const { results } = await linter.lintTargets([file]);
  const res = results[0];
  assert.equal(res.messages.length, 1);
});
