import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDtifDocument } from '../../src/core/dtif/document-parser.js';

void test('parseDtifDocument returns tokens and diagnostics for valid DTIF document', async () => {
  const document = {
    $version: '1.0.0',
    palette: {
      brand: {
        primary: {
          $type: 'color',
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
        $ref: '#/palette/brand/primary',
      },
    },
  } as const;

  const result = await parseDtifDocument({
    uri: new URL('file:///document.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  });

  assert.equal(result.parseDiagnostics.length, 0);
  assert.equal(result.resolutionDiagnostics.length, 0);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tokens.length, 2);
  const palette = result.tokens.find(
    (token) => token.pointer === '#/palette/brand/primary',
  );
  assert.ok(palette, 'expected palette token to exist');
  assert.equal(palette.type, 'color');
  assert.deepEqual(palette.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
});

void test('parseDtifDocument aggregates parser and resolver diagnostics', async () => {
  const document = {
    $version: '1.0.0',
    alias: {
      $type: 'color',
      $ref: '#/missing',
    },
    invalid: {
      $type: 'unknown',
      $value: true,
    },
  } as const;

  const result = await parseDtifDocument({
    uri: new URL('file:///invalid.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  });

  assert.ok(result.parseDiagnostics.length > 0);
  assert.ok(
    result.parseDiagnostics.some((diag) => diag.pointer === '#/alias/$ref'),
    'expected parser diagnostics to include missing alias pointer',
  );
  assert.ok(result.resolutionDiagnostics.length > 0);
  assert.ok(
    result.resolutionDiagnostics.some((diag) => diag.pointer === '#/missing'),
    'expected resolution diagnostics to include missing alias pointer',
  );
  assert.ok(result.diagnostics.length >= 2);
});
