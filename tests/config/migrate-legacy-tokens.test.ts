import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateLegacyTokens } from '../../src/config/migrate-legacy-tokens.ts';

void test('migrates legacy token groups to spec tokens', () => {
  const legacy = {
    colors: { primary: '#000' },
    spacing: { sm: 4 },
  };
  const migrated = migrateLegacyTokens(legacy);
  assert.deepEqual(migrated, {
    colors: {
      $type: 'color',
      primary: { $value: '#000' },
    },
    spacing: {
      $type: 'dimension',
      sm: { $value: 4 },
    },
  });
});

void test('ignores unsupported groups', () => {
  const legacy = {
    variables: { foo: { id: 'x' } },
    colors: ['red'],
  } as Record<string, unknown>;
  const migrated = migrateLegacyTokens(legacy);
  assert.deepEqual(migrated, {});
});
