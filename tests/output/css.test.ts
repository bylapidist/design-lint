import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DtifFlattenedToken } from '../../src/core/types.js';
import { createDtifTheme, createDtifToken } from '../helpers/dtif.js';

void test('generateCssVariables emits blocks for each theme with transformed names', () => {
  const tokens = {
    default: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#fff' },
    }),
    dark: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#000' },
    }),
  } as const;

  const css = generateCssVariables(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    ':root {',
    '  --color-palette-primary-color: #fff;',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-palette-primary-color: #000;',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

void test('generateCssVariables accepts flattened DTIF tokens', () => {
  const tokens = {
    default: createDtifTokens('#fff'),
    dark: createDtifTokens('#000'),
  } satisfies Record<string, readonly DtifFlattenedToken[]>;

  const css = generateCssVariables(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    ':root {',
    '  --color-palette-primary-color: #fff;',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-palette-primary-color: #000;',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

void test('generateCssVariables sorts themes with default first', () => {
  const tokens = {
    dark: createDtifTheme({
      'color.primary': { type: 'color', value: '#000' },
    }),
    default: createDtifTheme({
      'color.primary': { type: 'color', value: '#fff' },
    }),
    light: createDtifTheme({
      'color.primary': { type: 'color', value: '#eee' },
    }),
  } as const;

  const css = generateCssVariables(tokens);
  const expected = [
    ':root {',
    '  --color-primary: #fff;',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-primary: #000;',
    '}',
    '',
    "[data-theme='light'] {",
    '  --color-primary: #eee;',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

function createDtifTokens(value: string): readonly DtifFlattenedToken[] {
  return [
    createDtifToken('ColorPalette.PrimaryColor', {
      type: 'color',
      value,
    }),
  ];
}
