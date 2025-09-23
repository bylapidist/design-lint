import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';

void test('generateCssVariables emits blocks for each theme with transformed names', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: '#fff' },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: '#000' },
      },
    },
  };

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
  const tokens: Record<string, DesignTokens> = {
    dark: {
      color: {
        primary: { $type: 'color', $value: '#000' },
      },
    },
    default: {
      color: {
        primary: { $type: 'color', $value: '#fff' },
      },
    },
    light: {
      color: {
        primary: { $type: 'color', $value: '#eee' },
      },
    },
  };

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
  const tokens: DtifFlattenedToken[] = [
    {
      pointer: '#/ColorPalette/PrimaryColor',
      segments: ['ColorPalette', 'PrimaryColor'],
      name: 'ColorPalette.PrimaryColor',
      type: 'color',
      value,
      metadata: {},
    },
  ];
  return tokens;
}
