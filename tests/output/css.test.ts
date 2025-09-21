import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateCssVariables emits blocks for each theme with transformed names', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  };

  const css = generateCssVariables(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    ':root {',
    '  --color-palette-primary-color: #ffffff;',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-palette-primary-color: #000000;',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

void test('generateCssVariables sorts themes with default first', () => {
  const tokens: Record<string, DesignTokens> = {
    dark: {
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
    default: {
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    light: {
      color: {
        primary: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [238 / 255, 238 / 255, 238 / 255],
          },
        },
      },
    },
  };

  const css = generateCssVariables(tokens);
  const expected = [
    ':root {',
    '  --color-primary: #ffffff;',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-primary: #000000;',
    '}',
    '',
    "[data-theme='light'] {",
    '  --color-primary: #eeeeee;',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

void test('generateCssVariables serializes dimension objects to CSS values', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      spacing: {
        sm: {
          $type: 'dimension',
          $value: { dimensionType: 'length', value: 4, unit: 'px' },
        },
      },
    },
  };

  const css = generateCssVariables(tokens);
  const expected = [':root {', '  --spacing-sm: 4px;', '}'].join('\n');
  assert.equal(css, expected);
});
