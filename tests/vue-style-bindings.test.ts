import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';
import { createDtifTheme } from './helpers/dtif.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
    assert(colorMessages.length >= 1, `expected color violations in ${file}`);
    assert(
      spacingMessages.length >= 1,
      `expected spacing violations in ${file}`,
    );
  }
});

void test('Vue style binding forms are linted for object, array, multiline and computed expressions', async () => {
  const res = await lint('StyleBindings.vue');
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  const spacingMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/spacing',
  );

  assert(colorMessages.length >= 4);
  assert(spacingMessages.length >= 4);
  assert(
    colorMessages.every((message) => message.line > 1 && message.column > 1),
    'expected style binding color messages with source positions',
  );
  assert(
    spacingMessages.every((message) => message.line > 1 && message.column > 1),
    'expected style binding spacing messages with source positions',
  );
});

void test('Vue style bindings normalize camelCase props for property-specific rules', async () => {
  const linter = initLinter(
    {
      tokens: createDtifTheme({
        'fontSizes.base': {
          type: 'dimension',
          value: { value: 16, unit: 'px' },
        },
      }),
      rules: { 'design-token/font-size': 'error' },
    },
    { documentSource: new FileSource() },
  );
  const res = await linter.lintText(
    `<template><div :style="{ fontSize: '15px' }" /></template>`,
    'Comp.vue',
  );
  const fontSizeMessages = res.messages.filter(
    (message) => message.ruleId === 'design-token/font-size',
  );
  assert.equal(fontSizeMessages.length, 1);
});
