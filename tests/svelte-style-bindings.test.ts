import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

async function lint(file: string) {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const { results } = await linter.lintTargets(
    [path.join(fixtureDir, 'src', file)],
    false,
  );
  return results[0];
}

void test('style bindings report spacing and color violations', async () => {
  for (const file of ['App.svelte', 'Directive.svelte']) {
    const res = await lint(file);
    assert(
      res.messages.some((m) => m.ruleId === 'design-token/spacing'),
      `expected spacing violation from style binding in ${file}`,
    );
    assert(
      res.messages.some((m) => m.ruleId === 'design-token/colors'),
      `expected color violation from style binding in ${file}`,
    );
  }
});

void test('style bindings inside control-flow blocks report violations', async () => {
  const res = await lint('ControlFlow.svelte');
  const spacing = res.messages.filter(
    (m) => m.ruleId === 'design-token/spacing',
  );
  const colors = res.messages.filter((m) => m.ruleId === 'design-token/colors');
  assert.equal(
    spacing.length,
    7,
    `expected 7 spacing violations, got ${String(spacing.length)}`,
  );
  assert.equal(
    colors.length,
    7,
    `expected 7 color violations, got ${String(colors.length)}`,
  );
});
