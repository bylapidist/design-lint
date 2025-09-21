import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJsConstants } from '../../src/output/js.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateJsConstants emits constants for each theme', () => {
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

  const js = generateJsConstants(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const COLOR_PALETTE_PRIMARY_COLOR = {"colorSpace":"srgb","components":[1,1,1]};',
    'export const COLOR_PALETTE_PRIMARY_COLOR_DARK = {"colorSpace":"srgb","components":[0,0,0]};',
  ].join('\n');
  assert.equal(js, expected);
});
