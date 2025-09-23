import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DesignTokens } from '../../src/core/types.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('generateCssVariables emits blocks for each theme with transformed names', async () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      $version: '1.0.0',
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: srgb([1, 1, 1]) },
      },
    },
    dark: {
      $version: '1.0.0',
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: srgb([0, 0, 0]) },
      },
    },
  };

  const css = await generateCssVariables(tokens, {
    nameTransform: 'kebab-case',
  });
  const expected = [
    ':root {',
    '  --color-palette-primary-color: rgb(255, 255, 255);',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-palette-primary-color: rgb(0, 0, 0);',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});

void test('generateCssVariables sorts themes with default first', async () => {
  const tokens: Record<string, DesignTokens> = {
    dark: {
      $version: '1.0.0',
      color: {
        primary: { $type: 'color', $value: srgb([0, 0, 0]) },
      },
    },
    default: {
      $version: '1.0.0',
      color: {
        primary: { $type: 'color', $value: srgb([1, 1, 1]) },
      },
    },
    light: {
      $version: '1.0.0',
      color: {
        primary: { $type: 'color', $value: srgb([0.9, 0.9, 0.9]) },
      },
    },
  };

  const css = await generateCssVariables(tokens);
  const expected = [
    ':root {',
    '  --color-primary: rgb(255, 255, 255);',
    '}',
    '',
    "[data-theme='dark'] {",
    '  --color-primary: rgb(0, 0, 0);',
    '}',
    '',
    "[data-theme='light'] {",
    '  --color-primary: rgb(230, 230, 230);',
    '}',
  ].join('\n');
  assert.equal(css, expected);
});
