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

void test('TokenRegistry retrieves DTIF tokens by theme and pointer', async () => {
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

  const pointer: JsonPointer = '#/copy/headline/primary';
  const defaultToken = registry.getDtifTokenByPointer(pointer);
  assert(defaultToken);
  assert.equal(defaultToken.value, 'Hello');

  const darkToken = registry.getDtifTokenByPointer(pointer, 'dark');
  assert(darkToken);
  assert.equal(darkToken.value, 'Hi');

  const canonical = registry.getDtifTokenByName('copy.headline.primary');
  assert(canonical);
  assert.equal(canonical.pointer, '#/copy/headline/primary');
  assert.equal(canonical.value, 'Hello');

  const aliasToken = registry.getDtifTokenByName('copy.headline.secondary');
  assert(aliasToken);
  assert.equal(aliasToken.pointer, '#/copy/headline/secondary');
  assert.equal(aliasToken.value, 'Hello');

  const darkPrimary = registry.getDtifTokenByName(
    'copy.headline.primary',
    'dark',
  );
  assert(darkPrimary);
  assert.equal(darkPrimary.value, 'Hi');

  const dtifAll = registry.getDtifTokens();
  assert(dtifAll.some((token) => token.pointer === pointer));
  const dtifDark = registry.getDtifTokens('dark');
  assert.equal(dtifDark.length, darkTokens.length);
});

void test('TokenRegistry applies name transforms for DTIF lookups', async () => {
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

  const dtif = registry.getDtifTokenByName('color-group.primary-color');
  assert(dtif);
  assert.equal(dtif.pointer, '#/ColorGroup/PrimaryColor');
  assert.equal(dtif.value, 'brand');
});

void test('TokenRegistry merges DTIF tokens across themes by pointer', async () => {
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

  const all = registry.getDtifTokens();
  assert.equal(all.length, 1);
  assert.equal(all[0]?.value, 'Submit');

  const dark = registry.getDtifTokens('dark');
  assert.equal(dark.length, 1);
  assert.equal(dark[0]?.value, 'Send');
});

void test('TokenRegistry indexes flattened DTIF tokens', () => {
  const dtifTokens: Record<string, readonly DtifFlattenedToken[]> = {
    default: [
      {
        id: '#/ColorGroup/PrimaryColor',
        pointer: '#/ColorGroup/PrimaryColor',
        path: ['ColorGroup', 'PrimaryColor'],
        name: 'PrimaryColor',
        type: 'color',
        value: '#fff',
        raw: '#fff',
        metadata: { extensions: {} },
      },
    ],
  };

  const registry = new TokenRegistry(dtifTokens, {
    nameTransform: 'kebab-case',
  });

  const dtifToken = registry.getDtifTokenByPointer('#/ColorGroup/PrimaryColor');
  assert(dtifToken);
  assert.equal(dtifToken.value, '#fff');
  assert.equal(dtifToken.pointer, '#/ColorGroup/PrimaryColor');

  const nameLookup = registry.getDtifTokenByName('color-group.primary-color');
  assert(nameLookup);
  assert.equal(nameLookup.pointer, '#/ColorGroup/PrimaryColor');
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

void test('TokenRegistry rejects non-DTIF token records', () => {
  const legacyTokens = {
    color: {
      base: { $type: 'color', $value: '#fff' },
    },
  };

  assert.throws(
    () =>
      new TokenRegistry({
        default: legacyTokens as unknown as DesignTokens,
      }),
    /requires DTIF token documents/,
  );
});
