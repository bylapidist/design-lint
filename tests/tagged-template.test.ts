import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const fixtureDir = path.join(__dirname, 'fixtures', 'tagged-template');

void test('reports CSS in tagged template literals', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const file = path.join(fixtureDir, 'src', 'styled.ts');
  const {
    results: [res],
  } = await linter.lintTargets([file]);
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 2);
});
