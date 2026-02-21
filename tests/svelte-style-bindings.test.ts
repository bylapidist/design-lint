import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';
import { createDtifTheme } from './helpers/dtif.js';

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
    res.messages.some((message) => message.ruleId === 'parse-error'),
    false,
    'expected no parse-error diagnostics from control-flow bindings',
  );
  assert(
    res.messages.some((message) => message.ruleId === 'design-token/colors'),
    'expected static color bindings to be linted inside control-flow blocks',
  );
});

void test('style directives skip dynamic expression values', async () => {
  const linter = initLinter(
    {
      tokens: createDtifTheme({
        'spacing.sm': { type: 'dimension', value: { value: 4, unit: 'px' } },
      }),
      rules: { 'design-token/spacing': 'error' },
    },
    { documentSource: new FileSource() },
  );
  const res = await linter.lintText(
    [
      '<script>',
      '  const value = 5;',
      '</script>',
      '<div style:margin-left={value}px />',
    ].join('\n'),
    'Comp.svelte',
  );
  assert.equal(res.messages.length, 0);
});
