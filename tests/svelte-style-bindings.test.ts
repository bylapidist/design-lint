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

void test('style bindings report spacing violations', async () => {
  const res = await lint('App.svelte');
  assert(
    res.messages.some((m) => m.ruleId === 'design-token/spacing'),
    'expected spacing violation from style binding in App.svelte',
  );
  assert(
    res.messages.some((m) => m.ruleId === 'design-token/font-size'),
    'expected font-size violation from style binding in App.svelte',
  );

  const directive = await lint('Directive.svelte');
  assert(
    directive.messages.some((m) => m.ruleId === 'design-token/spacing'),
    'expected spacing violation from style binding in Directive.svelte',
  );
});

void test('style bindings inside control-flow blocks parse without crashing', async () => {
  const res = await lint('ControlFlow.svelte');
  assert.equal(
    res.messages.length,
    0,
    `expected no violations from control-flow bindings, got ${String(res.messages.length)}`,
  );
});
