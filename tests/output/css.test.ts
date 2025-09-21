import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateCssVariables emits blocks for each theme with transformed names', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: { $type: 'string', $value: '#fff' },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: { $type: 'string', $value: '#000' },
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

void test('generateCssVariables sorts themes with default first', () => {
  const tokens: Record<string, DesignTokens> = {
    dark: {
      color: {
        primary: { $type: 'string', $value: '#000' },
      },
    },
    default: {
      color: {
        primary: { $type: 'string', $value: '#fff' },
      },
    },
    light: {
      color: {
        primary: { $type: 'string', $value: '#eee' },
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
