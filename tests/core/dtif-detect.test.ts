import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasDtifIndicators,
  isLikelyDtifDesignTokens,
} from '../../src/core/dtif/detect.js';

void test('hasDtifIndicators detects $ref aliases', () => {
  const alias = { $ref: '#/colors/brand/primary' };
  assert.equal(hasDtifIndicators(alias), true);
});

void test('hasDtifIndicators walks nested collections', () => {
  const document = {
    button: {
      primary: {
        $type: 'color',
        $value: { $ref: '#/palette/core' },
      },
    },
  };
  assert.equal(hasDtifIndicators(document), true);
});

void test('isLikelyDtifDesignTokens matches DTIF documents', () => {
  const dtifDocument = {
    $version: '1.0.0',
    media: {
      tablet: { $type: 'dimension', $value: { unit: 'px', value: 768 } },
    },
  };
  assert.equal(isLikelyDtifDesignTokens(dtifDocument), true);
});

void test('isLikelyDtifDesignTokens matches color values without $version', () => {
  const dtifDocument = {
    color: {
      brand: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    },
  } satisfies Record<string, unknown>;

  assert.equal(isLikelyDtifDesignTokens(dtifDocument), true);
});

void test('isLikelyDtifDesignTokens matches color component objects without $version', () => {
  const dtifDocument = {
    color: {
      brand: {
        primary: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: {
              red: { $value: 1 },
              green: { $value: 0 },
              blue: { $value: 0 },
            },
          },
        },
      },
    },
  } satisfies Record<string, unknown>;

  assert.equal(isLikelyDtifDesignTokens(dtifDocument), true);
});

void test('isLikelyDtifDesignTokens matches dimension values without $version', () => {
  const dtifDocument = {
    size: {
      small: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
    },
  } satisfies Record<string, unknown>;

  assert.equal(isLikelyDtifDesignTokens(dtifDocument), true);
});

void test('isLikelyDtifDesignTokens matches duration values without $version', () => {
  const dtifDocument = {
    motion: {
      fast: {
        $type: 'duration',
        $value: { durationType: 'time', value: 200, unit: 'ms' },
      },
    },
  } satisfies Record<string, unknown>;

  assert.equal(isLikelyDtifDesignTokens(dtifDocument), true);
});

void test('isLikelyDtifDesignTokens rejects legacy token trees', () => {
  const legacyDocument = {
    $schema: 'https://design-tokens.org',
    palette: {
      brand: {
        primary: { $type: 'color', $value: '#006FFF' },
      },
    },
  };
  assert.equal(isLikelyDtifDesignTokens(legacyDocument), false);
});

void test('isLikelyDtifDesignTokens ignores legacy gradient arrays', () => {
  const legacyGradient = {
    gradient: {
      $type: 'gradient',
      hero: {
        $value: [
          { color: '#000', position: 0 },
          { color: '#fff', position: 1 },
        ],
      },
    },
  } as const;

  assert.equal(isLikelyDtifDesignTokens(legacyGradient), false);
});
