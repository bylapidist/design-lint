import test from 'node:test';
import assert from 'node:assert/strict';
import { createDtifSession } from '../../src/core/dtif/session.js';
import { resolveDocumentTokens } from '../../src/core/dtif/resolve-tokens.js';

void test('resolveDocumentTokens returns resolved views for tokens and aliases', async () => {
  const session = createDtifSession();
  const document = {
    $version: '1.0.0',
    palette: {
      brand: {
        primary: {
          $type: 'color',
          $description: 'Brand primary',
          $extensions: {
            'org.example.tokens': { grade: 'A' },
          },
          $value: {
            colorSpace: 'srgb',
            components: [0, 0.435, 1],
          },
        },
      },
    },
    button: {
      label: {
        $type: 'color',
        $description: 'Alias to brand primary',
        $deprecated: { $replacement: '#/palette/brand/primary' },
        $ref: '#/palette/brand/primary',
      },
    },
  } as const;
  const input = {
    uri: new URL('file:///resolved.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  } as const;

  const result = await session.parse(input);
  const resolved = resolveDocumentTokens(result);

  assert.equal(resolved.resolutionDiagnostics.length, 0);
  assert.equal(resolved.tokens.length, 2);

  const primary = resolved.tokens.find(
    (token) => token.pointer === '#/palette/brand/primary',
  );
  assert.ok(primary, 'expected to find primary token');
  assert.equal(primary.type, 'color');
  assert.deepEqual(primary.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
  assert.equal(primary.metadata.description, 'Brand primary');
  assert.deepEqual(primary.metadata.extensions, {
    'org.example.tokens': { grade: 'A' },
  });
  const primarySource = primary.metadata.source;
  assert.ok(primarySource);
  assert.equal(primarySource.uri, 'file:///resolved.tokens.json');

  const alias = resolved.tokens.find(
    (token) => token.pointer === '#/button/label',
  );
  assert.ok(alias, 'expected to find alias token');
  assert.equal(alias.type, 'color');
  assert.deepEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
  assert.deepEqual(alias.aliases, ['#/palette/brand/primary']);
  assert.equal(alias.metadata.description, 'Alias to brand primary');
  assert.equal(alias.metadata.deprecated, '#/palette/brand/primary');
  const aliasSource = alias.metadata.source;
  assert.ok(aliasSource);
  assert.equal(aliasSource.uri, 'file:///resolved.tokens.json');
});

void test('resolveDocumentTokens collects resolution diagnostics', async () => {
  const session = createDtifSession();
  const document = {
    $version: '1.0.0',
    alias: {
      $type: 'color',
      $ref: '#/missing',
    },
  } as const;
  const input = {
    uri: new URL('file:///invalid-alias.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  } as const;

  const result = await session.parse(input);
  const resolved = resolveDocumentTokens(result);

  assert.ok(
    resolved.tokens.some((token) => token.pointer === '#/alias'),
    'expected alias token to be present despite resolution failure',
  );
  assert.ok(
    resolved.resolutionDiagnostics.some((diag) => diag.pointer === '#/missing'),
    'expected resolution diagnostics to include missing pointer information',
  );
  const diagnostic = resolved.resolutionDiagnostics.find(
    (diag) => diag.pointer === '#/missing',
  );
  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, 'error');
});
