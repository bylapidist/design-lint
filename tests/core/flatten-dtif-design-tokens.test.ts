import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticBag } from '@lapidist/dtif-parser';
import {
  createDtifSession,
  type DtifParseResult,
  type DtifParseSession,
  type DtifDiagnosticMessage,
} from '../../src/core/dtif/session.js';
import { flattenDtifDesignTokens } from '../../src/utils/tokens/index.js';
import { registerTokenTransform } from '../../src/core/parser/index.js';
import type { DesignTokens, TokenGroup } from '../../src/core/types.js';

void test('flattenDtifDesignTokens flattens DTIF tokens with metadata', async () => {
  const document = {
    $version: '1.0.0',
    button: {
      primary: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.1, 0.3, 0.7],
        },
        $description: 'Primary button background',
      },
      label: {
        $type: 'color',
        $ref: '#/button/primary',
        $description: 'Alias to primary background',
      },
    },
  } satisfies Record<string, unknown>;

  const tokens = await flattenDtifDesignTokens(document);
  const byPath = new Map(tokens.map((token) => [token.path, token]));

  const primary = byPath.get('button.primary');
  assert.ok(primary, 'expected primary token');
  assert.equal(primary.type, 'color');
  assert.deepEqual(primary.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.3, 0.7],
  });
  assert.equal(primary.metadata.description, 'Primary button background');
  assert.equal(primary.metadata.deprecated, undefined);

  const alias = byPath.get('button.label');
  assert.ok(alias, 'expected alias token');
  assert.equal(alias.type, 'color');
  assert.deepEqual(alias.aliases, ['button.primary']);
  assert.equal(alias.metadata.description, 'Alias to primary background');
  assert.deepEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.3, 0.7],
  });
});

void test('flattenDtifDesignTokens applies name transforms', async () => {
  const document = {
    $version: '1.0.0',
    ButtonGroup: {
      BaseColor: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 1, 1],
        },
      },
      EmphasisColor: {
        $type: 'color',
        $ref: '#/ButtonGroup/BaseColor',
      },
    },
  } satisfies Record<string, unknown>;

  const tokens = await flattenDtifDesignTokens(document, {
    nameTransform: 'kebab-case',
  });

  assert.deepEqual(
    tokens.map((token) => token.path),
    ['button-group.base-color', 'button-group.emphasis-color'],
  );
  const alias = tokens.find(
    (token) => token.path === 'button-group.emphasis-color',
  );
  assert.ok(alias);
  assert.deepEqual(alias.aliases, ['button-group.base-color']);
});

void test('flattenDtifDesignTokens forwards warning diagnostics', async () => {
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
  const tokens = await flattenDtifDesignTokens(
    { $version: '1.0.0' },
    {
      session,
      onWarn: (message) => warnings.push(message),
    },
  );

  assert.equal(tokens.length, 0);
  assert.equal(warnings.length, 1);
  const [message] = warnings;
  assert.ok(message.includes('Test warning'));
  assert.ok(message.includes('pointer example'));
});

void test('flattenDtifDesignTokens applies inline transforms', async () => {
  const document = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.2, 0.2, 0.2],
        },
      },
    },
  } satisfies Record<string, unknown>;

  const tokens = await flattenDtifDesignTokens(document, {
    transforms: [
      (input: DesignTokens): DesignTokens => {
        const source = input as DesignTokens & Record<string, unknown>;
        const clone: DesignTokens & Record<string, unknown> = { ...source };
        const colorGroup = (clone.color ?? { $type: 'color' }) as TokenGroup;
        colorGroup.variant = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.8, 0.8, 0.8],
          },
        };
        clone.color = colorGroup;
        return clone;
      },
    ],
  });

  const variant = tokens.find((token) => token.path === 'color.variant');
  assert.ok(variant, 'expected inline transform to add variant token');
  assert.equal(variant.type, 'color');
  assert.deepEqual(variant.value, {
    colorSpace: 'srgb',
    components: [0.8, 0.8, 0.8],
  });
});

void test('flattenDtifDesignTokens applies registered transforms', async () => {
  const unregister = registerTokenTransform((input: DesignTokens) => {
    const source = input as DesignTokens & Record<string, unknown>;
    const clone: DesignTokens & Record<string, unknown> = { ...source };
    const colorGroup = (clone.color ?? { $type: 'color' }) as TokenGroup;
    colorGroup.extra = {
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0.3, 0.3, 0.3],
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
            components: [0.1, 0.2, 0.3],
          },
        },
      },
    } satisfies Record<string, unknown>;

    const tokens = await flattenDtifDesignTokens(document);
    const extra = tokens.find((token) => token.path === 'color.extra');
    assert.ok(extra, 'expected transform to add extra token');
    assert.equal(extra.type, 'color');
    assert.deepEqual(extra.value, {
      colorSpace: 'srgb',
      components: [0.3, 0.3, 0.3],
    });
  } finally {
    unregister();
  }
});
