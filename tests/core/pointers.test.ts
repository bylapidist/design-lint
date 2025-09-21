import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizePointer } from '../../src/core/parser/pointers.js';

void test('canonicalizePointer normalizes same-document fragments', () => {
  assert.equal(
    canonicalizePointer('#/palette/primary', 'Token #/palette/primary'),
    '/palette/primary',
  );
  assert.equal(canonicalizePointer('#', 'Token #'), '');
});

void test('canonicalizePointer preserves document URIs while normalizing fragments', () => {
  assert.equal(
    canonicalizePointer(
      'https://cdn.example.com/tokens.dtif.json#/colors/brand',
      'Token https://cdn.example.com/tokens.dtif.json#/colors/brand',
    ),
    'https://cdn.example.com/tokens.dtif.json#/colors/brand',
  );
  assert.equal(
    canonicalizePointer(
      'tokens/base.dtif.json#/foo~0bar',
      'Token tokens/base.dtif.json#/foo~0bar',
    ),
    'tokens/base.dtif.json#/foo~0bar',
  );
});

void test('canonicalizePointer rejects document traversal and invalid escapes', () => {
  assert.throws(() =>
    canonicalizePointer(
      '../tokens/base.dtif.json#/palette/primary',
      'Token ../tokens/base.dtif.json#/palette/primary',
    ),
  );
  assert.throws(() =>
    canonicalizePointer('#/palette/../primary', 'Token #/palette/../primary'),
  );
  assert.throws(() =>
    canonicalizePointer('#/palette/~2primary', 'Token #/palette/~2primary'),
  );
});
