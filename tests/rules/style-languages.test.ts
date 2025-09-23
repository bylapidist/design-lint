import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

const config = {
  tokens: {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
    },
    spacing: {
      sm: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
    },
    opacity: { full: { $type: 'number', $value: 1 } },
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/spacing': 'error',
    'design-token/opacity': 'error',
  },
};

const cssSample = '.a { .b { color: #fff; margin: 5px; opacity: 0.5; } }';

function assertIds(messages: { ruleId: string }[]) {
  const ids = messages.map((m) => m.ruleId).sort();
  assert.deepEqual(ids, [
    'design-token/colors',
    'design-token/opacity',
    'design-token/spacing',
  ]);
}

void test('reports raw tokens in .scss files', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(cssSample, 'file.scss');
  assert.equal(res.messages.length, 3);
  assertIds(res.messages);
});

void test('reports raw tokens in Vue <style lang="scss">', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    `<template><div/></template><style lang="scss">${cssSample}</style>`,
    'Comp.vue',
  );
  assert.equal(res.messages.length, 3);
  assertIds(res.messages);
});

void test('reports raw tokens in Svelte <style lang="scss">', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    `<div></div><style lang="scss">${cssSample}</style>`,
    'Comp.svelte',
  );
  assert.equal(res.messages.length, 3);
  assertIds(res.messages);
});

void test('reports raw tokens in string style attributes', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    `const C = () => <div style="color: #fff; margin: 5px; opacity: 0.5"></div>;`,
    'file.tsx',
  );
  assert.equal(res.messages.length, 3);
  assertIds(res.messages);
});

void test('reports raw tokens once for single style property', async () => {
  const linter = initLinter(
    {
      tokens: {
        color: {
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          },
        },
      },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    `const C = () => <div style="color: #fff"></div>;`,
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0]?.ruleId, 'design-token/colors');
});
