import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Linter } from '../src/core/engine.ts';
import { loadConfig } from '../src/config/loader.ts';

const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

test('lintFile delegates to lintFiles', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config);
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const res1 = await linter.lintFile(file);
  const res2 = await linter.lintFiles([file]);
  assert.deepEqual(res1, res2[0]);
});
