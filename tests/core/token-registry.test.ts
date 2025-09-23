import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDtifTokenObject } from '../../src/core/dtif/parse.js';
import type {
  DesignTokens,
  DtifFlattenedToken,
  JsonPointer,
} from '../../src/core/types.js';
import { TokenRegistry } from '../../src/core/token-registry.js';

async function flattenDocument(
  document: DesignTokens,
  uri: string,
): Promise<readonly DtifFlattenedToken[]> {
  const result = await parseDtifTokenObject(document, { uri });
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  assert.strictEqual(errors.length, 0);
  return result.tokens;
}

void test('getToken retrieves tokens by theme and resolves aliases', async () => {
  const defaultDoc: DesignTokens = {
    $version: '1.0.0',
    copy: {
      headline: {
        primary: { $type: 'string', $value: 'Hello' },
        secondary: { $type: 'string', $ref: '#/copy/headline/primary' },
      },
    },
  };
  const darkDoc: DesignTokens = {
    $version: '1.0.0',
    copy: {
      headline: {
        primary: { $type: 'string', $value: 'Hi' },
      },
    },
  };

  const defaultTokens = await flattenDocument(
    defaultDoc,
    'memory://token-registry/default.json',
  );
  const darkTokens = await flattenDocument(
    darkDoc,
    'memory://token-registry/dark.json',
  );

  const registry = new TokenRegistry({
    default: defaultTokens,
    dark: darkTokens,
  });

  assert.equal(registry.getToken('copy.headline.primary')?.value, 'Hello');
  assert.equal(registry.getToken('copy.headline.secondary')?.value, 'Hello');
  assert.equal(registry.getToken('copy.headline.primary', 'dark')?.value, 'Hi');

  const pointer: JsonPointer = '#/copy/headline/primary';
  const defaultToken = registry.getDtifTokenByPointer(pointer);
  assert(defaultToken);
  assert.equal(defaultToken.value, 'Hello');

  const darkToken = registry.getDtifTokenByPointer(pointer, 'dark');
  assert(darkToken);
  assert.equal(darkToken.value, 'Hi');

  const aliasToken = registry.getDtifTokenByName('copy.headline.secondary');
  assert(aliasToken);
  assert.equal(aliasToken.pointer, '#/copy/headline/secondary');
  assert.equal(aliasToken.value, 'Hello');

  const dtifAll = registry.getDtifTokens();
  assert(dtifAll.some((token) => token.pointer === pointer));
  const dtifDark = registry.getDtifTokens('dark');
  assert.equal(dtifDark.length, darkTokens.length);
});

void test('getToken normalizes paths and applies name transforms', async () => {
  const doc: DesignTokens = {
    $version: '1.0.0',
    ColorGroup: {
      PrimaryColor: { $type: 'string', $value: 'brand' },
    },
  };

  const tokens = await flattenDocument(
    doc,
    'memory://token-registry/name-transform.json',
  );

  const registry = new TokenRegistry(
    { default: tokens },
    { nameTransform: 'kebab-case' },
  );

  assert.equal(registry.getToken('ColorGroup.PrimaryColor')?.value, 'brand');
  assert.equal(registry.getToken('color-group.primary-color')?.value, 'brand');

  const dtif = registry.getDtifTokenByName('color-group.primary-color');
  assert(dtif);
  assert.equal(dtif.pointer, '#/ColorGroup/PrimaryColor');
});

void test('getTokens returns flattened tokens and dedupes across themes', async () => {
  const defaultDoc: DesignTokens = {
    $version: '1.0.0',
    copy: {
      button: {
        label: { $type: 'string', $value: 'Submit' },
      },
    },
  };
  const darkDoc: DesignTokens = {
    $version: '1.0.0',
    copy: {
      button: {
        label: { $type: 'string', $value: 'Send' },
      },
    },
  };

  const defaultTokens = await flattenDocument(
    defaultDoc,
    'memory://token-registry/default-dedupe.json',
  );
  const darkTokens = await flattenDocument(
    darkDoc,
    'memory://token-registry/dark-dedupe.json',
  );

  const registry = new TokenRegistry({
    default: defaultTokens,
    dark: darkTokens,
  });

  const all = registry.getTokens();
  assert.equal(all.length, 1);
  const [first] = all;
  assert(first);
  assert.equal(first.path, 'copy.button.label');

  const dark = registry.getTokens('dark');
  assert.equal(dark.length, 1);
  assert.equal(dark[0].value, 'Send');
});

void test('TokenRegistry indexes flattened DTIF tokens', () => {
  const dtifTokens: Record<string, readonly DtifFlattenedToken[]> = {
    default: [
      {
        pointer: '#/ColorGroup/PrimaryColor',
        segments: ['ColorGroup', 'PrimaryColor'],
        name: 'PrimaryColor',
        type: 'color',
        value: '#fff',
        metadata: {},
      },
    ],
  };

  const registry = new TokenRegistry(dtifTokens, {
    nameTransform: 'kebab-case',
  });

  const token = registry.getToken('color-group.primary-color');
  assert(token);
  assert.equal(token.value, '#fff');
  assert.equal(token.path, 'color-group.primary-color');

  const dtifToken = registry.getDtifTokenByPointer('#/ColorGroup/PrimaryColor');
  assert(dtifToken);
  assert.equal(dtifToken.value, '#fff');
  assert.equal(dtifToken.pointer, '#/ColorGroup/PrimaryColor');
});

void test('TokenRegistry requires cached DTIF tokens for documents', () => {
  const document: DesignTokens = { $version: '1.0.0' };

  assert.throws(
    () =>
      new TokenRegistry({
        default: document,
      }),
    /Missing cached DTIF tokens/,
  );
});
