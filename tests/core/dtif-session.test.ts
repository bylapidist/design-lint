import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDtifSession,
  diagnosticsToMessages,
} from '../../src/core/dtif/session.js';

const VALID_DOCUMENT = {
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

void test('createDtifSession returns parse artefacts', async () => {
  const sessionHandle = createDtifSession();
  const input = {
    uri: new URL('file:///valid.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(VALID_DOCUMENT),
  } as const;
  const result = await sessionHandle.parse(input);
  assert.ok(result.document, 'expected document to be defined');
  assert.ok(result.ast, 'expected AST to be defined');
  assert.ok(result.graph, 'expected graph to be defined');
  assert.ok(result.resolver, 'expected resolver to be defined');
  assert.equal(result.extensions.length, 0);
  assert.equal(result.diagnostics.hasErrors(), false);
  const session = sessionHandle.getSession();
  assert.strictEqual(sessionHandle.getSession(), session);
});

void test('diagnosticsToMessages exposes pointer and source details', async () => {
  const sessionHandle = createDtifSession();
  const invalidDocument = {
    $version: '1.0.0',
    button: {
      primary: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
        },
        $foo: true,
      },
    },
  } as const;
  const input = {
    uri: new URL('file:///invalid.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(invalidDocument),
  } as const;
  const result = await sessionHandle.parse(input);
  assert.equal(result.diagnostics.hasErrors(), true);
  const messages = diagnosticsToMessages(result.diagnostics);
  assert.ok(messages.length > 0);
  assert.ok(messages.some((msg) => msg.pointer === '#/button/primary'));
  const primaryMessage = messages.find(
    (msg) => msg.pointer === '#/button/primary',
  );
  assert.ok(
    primaryMessage,
    'expected to find diagnostic for the primary token',
  );
  assert.equal(primaryMessage.code, 'DTIF4010');
  const location = primaryMessage.location;
  assert.ok(location, 'expected diagnostic location to be defined');
  assert.equal(location.uri, 'file:///invalid.tokens.json');
  assert.ok(location.start.line >= 1);
  assert.ok(location.start.column >= 1);
});
