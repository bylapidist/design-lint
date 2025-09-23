import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DtifDesignTokenError,
  getTokenLocation,
  parseDesignTokens,
  registerTokenTransform,
  type TokenTransform,
} from '../../src/core/parser/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('parseDesignTokens flattens DTIF tokens and records locations', async () => {
  const tokens = {
    $version: '1.0.0',
    button: {
      background: {
        $type: 'color',
        $description: 'Button tokens',
        $value: { colorSpace: 'srgb', components: [0.1, 0.2, 0.3] },
      },
      label: {
        $type: 'color',
        $ref: '#/button/background',
      },
    },
  } satisfies DesignTokens;

  const flat = await parseDesignTokens(tokens);
  const byPath = new Map(flat.map((token) => [token.path, token]));

  const background = byPath.get('button.background');
  assert.ok(background, 'expected background token');
  assert.equal(background.metadata.description, 'Button tokens');
  assert.deepEqual(background.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.2, 0.3],
  });

  const label = byPath.get('button.label');
  assert.ok(label, 'expected label alias token');
  assert.deepEqual(label.aliases, ['button.background']);

  const loc = getTokenLocation('button.background');
  assert.ok(loc, 'expected location to be recorded');
  assert.ok(loc.line > 0);
  assert.ok(loc.column > 0);
});

void test('parseDesignTokens applies registered token transforms', async () => {
  const transform: TokenTransform = (doc) => ({
    ...doc,
    added: {
      token: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] },
      },
    },
  });
  const unregister = registerTokenTransform(transform);
  try {
    const tokens = { $version: '1.0.0' } satisfies DesignTokens;
    const flat = await parseDesignTokens(tokens);
    assert.ok(flat.some((token) => token.path === 'added.token'));
  } finally {
    unregister();
  }
});

void test('parseDesignTokens applies per-call transforms', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.2, 0.3, 0.4] },
      },
    },
  } satisfies DesignTokens;

  const flat = await parseDesignTokens(tokens, undefined, {
    transforms: [
      (doc) => ({
        ...doc,
        color: {
          ...doc.color,
          alias: { $type: 'color', $ref: '#/color/base' },
        },
      }),
    ],
  });

  const paths = flat.map((token) => token.path).sort();
  assert.deepEqual(paths, ['color.alias', 'color.base']);
});

void test('parseDesignTokens normalizes color values when requested', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      swatch: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  } satisfies DesignTokens;

  const [swatch] = await parseDesignTokens(tokens, undefined, {
    colorSpace: 'hex',
  });
  assert.ok(swatch, 'expected swatch token');
  assert.equal(swatch.value, '#ff0000');
});

void test('parseDesignTokens rejects documents with DTIF errors', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      alias: { $type: 'color', $ref: '#/color/missing' },
    },
  } satisfies DesignTokens;

  await assert.rejects(
    () => parseDesignTokens(tokens),
    (error: unknown) => {
      assert.ok(error instanceof DtifDesignTokenError);
      assert.match(error.message, /Failed to parse DTIF design tokens/);
      return true;
    },
  );
});
