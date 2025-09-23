import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJsConstants } from '../../src/output/js.js';
import type { DesignTokens } from '../../src/core/types.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('generateJsConstants emits constants for each theme', async () => {
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

  const js = await generateJsConstants(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const COLOR_PALETTE_PRIMARY_COLOR = "rgb(255, 255, 255)";',
    'export const COLOR_PALETTE_PRIMARY_COLOR_DARK = "rgb(0, 0, 0)";',
  ].join('\n');
  assert.equal(js, expected);
});
