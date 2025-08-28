import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { Linter } from '../src/core/engine';

test('external plugin rules execute', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const linter = new Linter({
    plugins: [pluginPath],
    rules: { 'plugin/test': 'error' },
  });
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/test');
});
