import test from 'node:test';
import assert from 'node:assert/strict';
import type { DesignTokens, DtifFlattenedToken } from '../../../src/core/types.js';
import {
  attachDtifFlattenedTokens,
  getDtifFlattenedTokens,
  ensureDtifFlattenedTokens,
} from '../../../src/utils/tokens/dtif-cache.js';

void test('getDtifFlattenedTokens returns undefined for null and primitives', () => {
  assert.equal(getDtifFlattenedTokens(null), undefined);
  assert.equal(getDtifFlattenedTokens(undefined), undefined);
  assert.equal(getDtifFlattenedTokens(42), undefined);
  assert.equal(getDtifFlattenedTokens('string'), undefined);
});

void test('getDtifFlattenedTokens returns undefined when no tokens attached', () => {
  assert.equal(getDtifFlattenedTokens({}), undefined);
  assert.equal(getDtifFlattenedTokens([]), undefined);
});

void test('attachDtifFlattenedTokens is idempotent — second call is a no-op', () => {
  const target = {};
  const first: DtifFlattenedToken[] = [
    {
      id: '#/color/a',
      pointer: '#/color/a',
      path: ['color', 'a'],
      name: 'a',
      type: 'color',
      value: '#fff',
      metadata: { extensions: {} },
    },
  ];
  const second: DtifFlattenedToken[] = [];

  attachDtifFlattenedTokens(target, first);
  attachDtifFlattenedTokens(target, second); // should be ignored

  const cached = getDtifFlattenedTokens(target);
  assert.strictEqual(cached, first);
  assert.equal(cached.length, 1);
});

void test('ensureDtifFlattenedTokens skips parsing when cache already present', async () => {
  const document = { $version: '1.0.0' } as unknown as DesignTokens;
  const tokens: DtifFlattenedToken[] = [];
  attachDtifFlattenedTokens(document, tokens);

  // Should return without calling the parser
  await ensureDtifFlattenedTokens(document);

  assert.strictEqual(getDtifFlattenedTokens(document), tokens);
});

void test('ensureDtifFlattenedTokens parses and caches tokens from a valid DTIF document', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  } as unknown as DesignTokens;

  assert.equal(getDtifFlattenedTokens(document), undefined);

  await ensureDtifFlattenedTokens(document, {
    uri: 'memory://dtif-cache-test/tokens.json',
  });

  const cached = getDtifFlattenedTokens(document);
  assert.ok(cached);
  assert.ok(cached.length > 0);
  assert.ok(cached.some((t) => t.pointer === '#/color/primary'));
});

void test('ensureDtifFlattenedTokens does not attach tokens when document has errors', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      broken: {
        $type: 'color',
        $ref: '#/color/nonexistent',
      },
    },
  } as unknown as DesignTokens;

  await ensureDtifFlattenedTokens(document, {
    uri: 'memory://dtif-cache-test/broken.json',
  });

  // The document had errors so tokens should not have been attached
  assert.equal(getDtifFlattenedTokens(document), undefined);
});
