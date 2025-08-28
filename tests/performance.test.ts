import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig } from '../src/config/loader';
import { Linter } from '../src/core/engine';

test('lints large projects without crashing', async () => {
  const dir = path.join(__dirname, 'fixtures', 'large-project');
  const config = loadConfig(dir);
  const linter = new Linter(config);
  const results = await linter.lintFiles([dir]);
  assert.equal(results.length, 200);
});
