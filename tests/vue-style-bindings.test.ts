import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Linter } from '../src/core/engine';
import { loadConfig } from '../src/config/loader';

const fixtureDir = path.join(__dirname, 'fixtures', 'vue');

async function lint(file: string) {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config);
  const [res] = await linter.lintFiles([path.join(fixtureDir, 'src', file)]);
  return res;
}

test('Vue style bindings report spacing and color violations', async () => {
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
