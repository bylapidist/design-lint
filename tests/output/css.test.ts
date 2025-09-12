import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCssVariables } from '../../src/output/css.js';
import type { DesignTokens } from '../../src/core/types.js';

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
