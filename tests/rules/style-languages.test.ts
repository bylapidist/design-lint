import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { createDtifTheme } from '../helpers/dtif.js';

const config = {
  tokens: createDtifTheme({
    'color.primary': { type: 'color', value: '#000000' },
    'spacing.sm': { type: 'dimension', value: { value: 4, unit: 'px' } },
    'opacity.full': { type: 'number', value: 1 },
  }),
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

void test('reports deterministic parse-error for indented .sass files', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    '.a\n  color: #fff\n  margin: 5px\n  opacity: 0.5\n',
    'file.sass',
  );
  assert.equal(res.messages.length, 1);
  assert.deepEqual(res.messages[0], {
    ruleId: 'parse-error',
    message: 'Indented .sass syntax is not supported; use .scss instead.',
    severity: 'error',
    line: 1,
    column: 1,
  });
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

void test('reports deterministic parse-error in Vue <style lang="sass">', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    '<template><div/></template><style lang="sass">.a\n  color: #fff</style>',
    'Comp.vue',
  );
  assert.equal(res.messages.length, 1);
  assert.deepEqual(res.messages[0], {
    ruleId: 'parse-error',
    message: 'Indented .sass syntax is not supported; use .scss instead.',
    severity: 'error',
    line: 1,
    column: 1,
  });
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

void test('reports raw tokens in JSX object style attributes', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    `const C = () => <div style={{ color: '#fff', marginTop: '8px' }}></div>;`,
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0]?.ruleId, 'design-token/colors');
});

void test('normalizes JSX style object props to CSS-like names', async () => {
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
    `const C = () => <div style={{ fontSize: '15px' }}></div>;`,
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0]?.ruleId, 'design-token/font-size');
});

void test('reports raw tokens once for single style property', async () => {
  const linter = initLinter(
    {
      tokens: createDtifTheme({
        'color.primary': { type: 'color', value: '#000000' },
      }),
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

void test('reports static raw tokens in interpolated tagged templates', async () => {
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    [
      "import styled from 'styled-components';",
      'const spacing = 5;',
      'export const Comp = styled.div`',
      '  color: #fff;',
      '  --spacing: ${spacing}px;',
      '`;',
    ].join('\n'),
    'file.ts',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0]?.ruleId, 'design-token/colors');
  assert.equal(res.messages[0]?.line, 3);
});
