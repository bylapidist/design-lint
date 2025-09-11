import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';

const config = {
  tokens: {
    color: { $type: 'color', primary: { $value: '#000000' } },
    spacing: {
      $type: 'dimension',
      sm: { $value: { value: 4, unit: 'px' } },
    },
    opacity: { $type: 'number', full: { $value: 1 } },
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
      tokens: { color: { $type: 'color', primary: { $value: '#000000' } } },
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
