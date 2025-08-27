import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-system/deprecation flags deprecated token', async () => {
  const linter = new Linter({
    tokens: { deprecations: { old: { replacement: 'new' } } },
    rules: { 'design-system/deprecation': 'error' },
  });
  const res = await linter.lintText('const a = "old";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('new'));
});
