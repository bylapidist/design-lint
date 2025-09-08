import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/core/file-source.ts';

void test('reports CSS parse errors', async () => {
  const linter = new Linter({}, new FileSource());
  const res = await linter.lintText('.a { color: red;', 'bad.css');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].severity, 'error');
  assert.equal(res.messages[0].ruleId, 'parse-error');
});
