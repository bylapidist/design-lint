import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticBag } from '@lapidist/dtif-parser';
import {
  DtifDesignTokenError,
  getDtifTokenLocation,
  parseDtifDesignTokens,
  parseDtifDesignTokensObject,
  registerTokenTransform,
} from '../../src/core/parser/index.js';
import {
  createDtifSession,
  type DtifParseResult,
  type DtifParseSession,
  type DtifDiagnosticMessage,
} from '../../src/core/dtif/session.js';
import type { DesignTokens, TokenGroup } from '../../src/core/types.js';

void test('parseDtifDesignTokens flattens DTIF tokens with metadata', async () => {
  const document = {
    $version: '1.0.0',
    button: {
      $description: 'Button styles',
      background: {
        $type: 'color',
        $description: 'Primary fill',
        $value: {
          colorSpace: 'srgb',
          components: [0, 0.2, 0.6],
        },
      },
      label: {
        $type: 'color',
        $description: 'Alias to background',
        $ref: '#/button/background',
      },
    },
  } as const;

  const input = {
    uri: new URL('file:///dtif.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  } as const;

  const tokens = await parseDtifDesignTokens(input);
  const byPath = new Map(tokens.map((token) => [token.path, token]));

  assert.equal(tokens.length, 2);
  const background = byPath.get('button.background');
  assert.ok(background, 'expected background token');
  assert.equal(background.type, 'color');
  assert.equal(background.metadata.description, 'Primary fill');
  assert.deepEqual(background.metadata.extensions, undefined);
  assert.deepEqual(background.aliases, undefined);
  assert.deepEqual(background.value, {
    colorSpace: 'srgb',
    components: [0, 0.2, 0.6],
  });

  const alias = byPath.get('button.label');
  assert.ok(alias, 'expected alias token');
  assert.equal(alias.aliases?.[0], 'button.background');
  assert.equal(alias.metadata.description, 'Alias to background');
  assert.deepEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0, 0.2, 0.6],
  });

  const loc = getDtifTokenLocation('button.background');
  assert.ok(loc, 'expected token location to be recorded');
  assert.ok(loc.line > 0);
  assert.ok(loc.column > 0);
});

void test('parseDtifDesignTokens throws for DTIF diagnostics with errors', async () => {
  const invalidDocument = {
    $version: '1.0.0',
    alias: {
      $type: 'color',
      $ref: '#/missing',
    },
    invalid: {
      $value: 42,
    },
  } as const;

  const input = {
    uri: new URL('file:///invalid.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(invalidDocument, null, 2),
  } as const;

  await assert.rejects(
    () => parseDtifDesignTokens(input),
    (error: unknown) => {
      assert.ok(error instanceof DtifDesignTokenError);
      assert.ok(
        error.message.includes('Failed to parse DTIF design tokens'),
        'expected error message to include formatted diagnostics',
      );
      assert.ok(
        error.diagnostics.some((diag) => diag.pointer !== undefined),
        'expected diagnostics to include pointer information',
      );
      return true;
    },
  );
});

void test('parseDtifDesignTokens forwards warning diagnostics to callback', async () => {
  const baseSession = createDtifSession();
  const warningDiagnostic = {
    code: 'DTIF0000',
    message: 'Test warning',
    severity: 'warning',
    pointer: '#/example',
  } satisfies DtifDiagnosticMessage;

  const session: DtifParseSession = {
    parse(): Promise<DtifParseResult> {
      return Promise.resolve({
        diagnostics: new DiagnosticBag([warningDiagnostic]),
        extensions: [],
      } satisfies DtifParseResult);
    },
    getSession: () => baseSession.getSession(),
  };

  const warnings: string[] = [];
  const tokens = await parseDtifDesignTokens('memory://warning.tokens.json', {
    session,
    onWarn: (message) => warnings.push(message),
  });

  assert.equal(tokens.length, 0);
  assert.equal(warnings.length, 1);
  const [message] = warnings;
  assert.ok(message);
  assert.ok(message.includes('Test warning'));
  assert.ok(message.includes('example'));
});

void test('parseDtifDesignTokens normalizes colors when requested', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      swatch: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
        },
      },
    },
  } as const;

  const input = {
    uri: new URL('file:///color.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  } as const;

  const tokens = await parseDtifDesignTokens(input, { colorSpace: 'hex' });
  const swatch = tokens.find((token) => token.path === 'color.swatch');
  assert.ok(swatch, 'expected swatch token');
  assert.equal(swatch.value, '#ff0000');
});

void test('parseDtifDesignTokens accepts vendor-defined token types without registry entries', async () => {
  const document = {
    $version: '1.0.0',
    tokens: {
      vendor: {
        $type: 'com.example.tokens.vendor-type',
        $value: 'opaque vendor payload',
      },
    },
  } as const;

  const input = {
    uri: new URL('file:///vendor.tokens.json'),
    contentType: 'application/json',
    content: JSON.stringify(document, null, 2),
  } as const;

  const tokens = await parseDtifDesignTokens(input);
  assert.equal(tokens.length, 1);
  const [token] = tokens;
  assert.ok(token);
  assert.equal(token.path, 'tokens.vendor');
  assert.equal(token.type, 'com.example.tokens.vendor-type');
  assert.equal(token.value, 'opaque vendor payload');
});

void test('parseDtifDesignTokensObject flattens inline DTIF documents', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.1, 0.4, 0.9],
        },
      },
      emphasis: {
        $type: 'color',
        $ref: '#/color/base',
      },
    },
  } satisfies Record<string, unknown>;

  const tokens = await parseDtifDesignTokensObject(document);
  assert.equal(tokens.length, 2);
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  const base = byPath.get('color.base');
  assert.ok(base, 'expected base token');
  assert.equal(base.type, 'color');
  assert.deepEqual(base.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.4, 0.9],
  });
  const emphasis = byPath.get('color.emphasis');
  assert.ok(emphasis, 'expected emphasis token');
  assert.equal(emphasis.aliases?.[0], 'color.base');
});

void test('parseDtifDesignTokensObject rejects non-object inputs', async () => {
  await assert.rejects(
    // Cast to satisfy the Record signature in the call site.
    () =>
      parseDtifDesignTokensObject(
        'not-an-object' as unknown as Record<string, unknown>,
      ),
    (error: unknown) => {
      assert.ok(error instanceof TypeError);
      assert.match(error.message, /must be provided as an object/);
      return true;
    },
  );
});

void test('parseDtifDesignTokensObject applies inline transforms', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.2, 0.4, 0.6],
        },
      },
    },
  } satisfies Record<string, unknown>;

  const tokens = await parseDtifDesignTokensObject(document, {
    transforms: [
      (input: DesignTokens): DesignTokens => {
        const source = input as DesignTokens & Record<string, unknown>;
        const clone: DesignTokens & Record<string, unknown> = { ...source };
        const colorGroup = (clone.color ?? { $type: 'color' }) as TokenGroup;
        colorGroup.highlight = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.6, 0.7, 0.8],
          },
        };
        clone.color = colorGroup;
        return clone;
      },
    ],
  });

  const highlight = tokens.find((token) => token.path === 'color.highlight');
  assert.ok(highlight, 'expected transform to introduce highlight token');
  assert.equal(highlight.type, 'color');
  assert.deepEqual(highlight.value, {
    colorSpace: 'srgb',
    components: [0.6, 0.7, 0.8],
  });
});

void test('parseDtifDesignTokensObject applies registered transforms', async () => {
  const unregister = registerTokenTransform((input: DesignTokens) => {
    const source = input as DesignTokens & Record<string, unknown>;
    const clone: DesignTokens & Record<string, unknown> = { ...source };
    const colorGroup = (clone.color ?? { $type: 'color' }) as TokenGroup;
    colorGroup.accent = {
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0.5, 0.2, 0.7],
      },
    };
    clone.color = colorGroup;
    return clone;
  });

  try {
    const document = {
      $version: '1.0.0',
      color: {
        base: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.1, 0.1, 0.1],
          },
        },
      },
    } satisfies Record<string, unknown>;

    const tokens = await parseDtifDesignTokensObject(document);
    const accent = tokens.find((token) => token.path === 'color.accent');
    assert.ok(accent, 'expected global transform to add accent token');
    assert.equal(accent.type, 'color');
    assert.deepEqual(accent.value, {
      colorSpace: 'srgb',
      components: [0.5, 0.2, 0.7],
    });
  } finally {
    unregister();
  }
});
