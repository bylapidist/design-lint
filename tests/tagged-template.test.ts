import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Linter } from '../src/core/linter.ts';
import { loadConfig } from '../src/config/loader.ts';

const fixtureDir = path.join(__dirname, 'fixtures', 'tagged-template');

void test('reports CSS in tagged template literals', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config);
  const file = path.join(fixtureDir, 'src', 'styled.ts');
  const {
    results: [res],
  } = await linter.lintFiles([file]);
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 2);
});
