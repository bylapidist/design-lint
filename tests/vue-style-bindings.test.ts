import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';

const fixtureDir = path.join(__dirname, 'fixtures', 'vue');

async function lint(file: string) {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const {
    results: [res],
  } = await linter.lintTargets([path.join(fixtureDir, 'src', file)]);
  return res;
}

void test('Vue style bindings report spacing and color violations', async () => {
  for (const file of ['App.vue', 'Multi.vue']) {
    const res = await lint(file);
    const colorMessages = res.messages.filter(
      (m) => m.ruleId === 'design-token/colors',
    );
    const spacingMessages = res.messages.filter(
      (m) => m.ruleId === 'design-token/spacing',
    );
    assert(
      colorMessages.length >= 2,
      `expected color violations from template and style in ${file}`,
    );
    assert(
      spacingMessages.length >= 2,
      `expected spacing violations from template and style in ${file}`,
    );
  }
});
