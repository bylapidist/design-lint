import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Linter } from '../../src/core/linter.ts';
import { NodeEnvironment } from '../../src/adapters/node/environment.ts';

void test('Linter integrates registry, parser and trackers', async () => {
  const config = {
    tokens: {},
    rules: { 'design-token/colors': 'error' },
  };
  const env = NodeEnvironment(config);
  const linter = new Linter(config, env);
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'linter-int-'));
  const file = path.join(dir, 'file.css');
  await fs.writeFile(file, 'a{color:#fff;}');
  const res = await linter.lintFile(file);
  assert.equal(res.messages.length, 1);
});
