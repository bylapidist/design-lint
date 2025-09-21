import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseDesignTokens,
  registerTokenTransform,
  type TokenTransform,
} from '../../src/core/parser/index.js';
import { normalizeTokens } from '../../src/core/parser/normalize.js';
import {
  parseDesignTokensFile,
  TokenParseError,
} from '../../src/adapters/node/token-parser.js';
import type { DesignTokens, FlattenedToken } from '../../src/core/types.js';

void test('parseDesignTokens flattens tokens with paths in declaration order', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f' },
      red: { $value: '#f00' },
    },
    spacing: {
      $type: 'dimension',
      sm: { $value: { dimensionType: 'length', value: 4, unit: 'px' } },
    },
  };

  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.map((t) => t.path),
    ['color.blue', 'color.red', 'spacing.sm'],
  );
});

void test('parseDesignTokens accepts hex string color tokens', () => {
  const tokens: DesignTokens = {
    color: { $type: 'color', black: { $value: '#000' } },
  };
  assert.doesNotThrow(() => {
    parseDesignTokens(tokens);
  });
});

void test('parseDesignTokens warns on duplicate names differing only by case', () => {
  const tokens = {
    color: {
      $type: 'color',
      Blue: { $value: '#00f' },
      blue: { $value: '#00f' },
    },
  } as unknown as DesignTokens;

  const warnings: string[] = [];
  const result = parseDesignTokens(tokens, undefined, {
    onWarn: (m) => warnings.push(m),
  });
  assert.equal(result.length, 2);
  assert.ok(
    warnings.some((w) =>
      /duplicate token name differing only by case/i.test(w),
    ),
  );
  assert.ok(
    warnings.some((w) =>
      /duplicate token path differing only by case/i.test(w),
    ),
  );
});

void test('parseDesignTokens warns on duplicate paths differing only by case', () => {
  const tokens = {
    color: { $type: 'color', blue: { $value: '#00f' } },
    Color: { $type: 'color', Blue: { $value: '#00f' } },
  } as unknown as DesignTokens;

  const warnings: string[] = [];
  const result = parseDesignTokens(tokens, undefined, {
    onWarn: (m) => warnings.push(m),
  });
  assert.equal(result.length, 2);
  assert.ok(
    warnings.some((w) =>
      /duplicate token name differing only by case/i.test(w),
    ),
  );
  assert.ok(
    warnings.filter((w) =>
      /duplicate token path differing only by case/i.test(w),
    ).length >= 1,
  );
});

void test('parseDesignTokens rejects token names with forbidden characters', () => {
  const tokens = {
    'bad.name': { $value: 1 },
  } as unknown as DesignTokens;

  assert.throws(
    () => parseDesignTokens(tokens),
    /invalid token or group name/i,
  );
});

void test('parseDesignTokens allows token names containing slash characters', () => {
  const tokens: DesignTokens = {
    icons: {
      $type: 'color',
      'icon/home': { $value: '#000000' },
    },
  };

  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.map((token) => ({ path: token.path, pointer: token.pointer })),
    [{ path: 'icons.icon/home', pointer: '#/icons/icon~1home' }],
  );
});

void test('parseDesignTokens resolves alias pointers with escaped segments', () => {
  const tokens: DesignTokens = {
    icons: {
      $type: 'color',
      'icon/home': { $value: '#000000' },
      alias: { $ref: '#/icons/icon~1home' },
    },
  };

  const result = parseDesignTokens(tokens);
  const alias = result.find((token) => token.path === 'icons.alias');
  assert(alias);
  assert.deepEqual(alias.aliases, ['#/icons/icon~1home']);
});

void test('parseDesignTokens allows $schema at the root', () => {
  const tokens: DesignTokens = {
    $schema: 'https://design-tokens.github.io/schema.json',
    color: { $type: 'color', blue: { $value: '#00f' } },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].path, 'color.blue');
});

void test('parseDesignTokens rejects $schema in nested groups', () => {
  const tokens = {
    palette: {
      $schema: 'foo',
      primary: { $value: '#fff', $type: 'color' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /\$schema is only allowed/);
});

void test('parseDesignTokens rejects $metadata fields', () => {
  const tokens: DesignTokens = {
    $metadata: { version: 1 },
    color: {
      $type: 'color',
      $metadata: { note: 'ok' },
      blue: { $value: '#00f' },
    },
  };
  assert.throws(
    () => parseDesignTokens(tokens),
    /Invalid token or group name: \$metadata/,
  );
});

void test('parseDesignTokens rejects names starting with $', () => {
  const tokens = {
    $bad: { $value: 1 },
  } as unknown as DesignTokens;

  assert.throws(
    () => parseDesignTokens(tokens),
    /invalid token or group name/i,
  );
});

void test('parseDesignTokensFile reads a .tokens.json file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.tokens.json');
  const tokens: DesignTokens = {
    color: { $type: 'color', blue: { $value: '#00f' } },
  };
  await writeFile(file, JSON.stringify(tokens), 'utf8');

  const result = await parseDesignTokensFile(file);
  assert.equal(result[0].path, 'color.blue');
  assert.equal(result[0].value, '#00f');
  assert.equal(result[0].type, 'color');
  assert.equal(typeof result[0].metadata.loc.line, 'number');
  assert.equal(typeof result[0].metadata.loc.column, 'number');
});

void test('parseDesignTokensFile reads a .tokens.yaml file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.tokens.yaml');
  const yaml = "color:\n  $type: color\n  blue:\n    $value: '#00f'\n";
  await writeFile(file, yaml, 'utf8');

  const result = await parseDesignTokensFile(file);
  assert.equal(result[0].path, 'color.blue');
  assert.equal(result[0].value, '#00f');
  assert.equal(result[0].type, 'color');
  assert.equal(typeof result[0].metadata.loc.line, 'number');
  assert.equal(typeof result[0].metadata.loc.column, 'number');
});

void test('parseDesignTokensFile reports location on parse error', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'bad.tokens.json');
  await writeFile(file, '{ "color": { $type: "color", }', 'utf8');

  await assert.rejects(
    () => parseDesignTokensFile(file),
    (err: unknown) => {
      assert.ok(err instanceof TokenParseError);
      assert.equal(err.filePath, file);
      assert.ok(err.line >= 1);
      assert.ok(err.column >= 1);
      assert.ok(err.format().includes('^'));
      return true;
    },
  );
});

void test('parseDesignTokens rejects tokens missing explicit type', () => {
  const tokens = { foo: { $value: 1 } } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /missing \$type/i);
});

void test('parseDesignTokens rejects tokens missing $value', () => {
  const tokens = {
    color: { blue: { $type: 'color' } },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(tokens),
    /must be an object with \$value or \$ref/i,
  );
});

void test('parseDesignTokens rejects legacy shorthand token values', () => {
  const tokens = {
    color: { $type: 'color', blue: '#00f' },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(tokens),
    /must be an object with \$value/i,
  );
});

void test('parseDesignTokens rejects $deprecated pointers without fragments', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#000000' },
      legacy: {
        $value: '#ffffff',
        $deprecated: { $replacement: 'color.base' },
      },
    },
  };

  assert.throws(
    () => parseDesignTokens(tokens),
    /\$deprecated \$replacement pointer color\.base/,
  );
});

void test('parseDesignTokens accepts hsl color space tokens', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      hsl: {
        $value: { colorSpace: 'hsl', components: [120, 100, 50] },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].path, 'color.hsl');
});

void test('parseDesignTokens accepts hwb color space tokens', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      hwb: {
        $value: { colorSpace: 'hwb', components: [60, 0, 0] },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].path, 'color.hwb');
});

void test('parseDesignTokens captures $value fallback arrays', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      brand: { $value: ['rgb(255 0 0)', 'rgb(0 0 0)'] },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === 'color.brand');
  assert.ok(brand);
  assert.equal(brand.value, 'rgb(255 0 0)');
  assert.deepEqual(brand.fallbacks, ['rgb(0 0 0)']);
});

void test('parseDesignTokens resolves fallback aliases and tracks references', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#0033ff' },
      accent: { $value: [{ $ref: '#/color/base' }, '#00f'] },
    },
  };

  const result = parseDesignTokens(tokens);
  const accent = result.find((t) => t.path === 'color.accent');
  assert.ok(accent);
  assert.equal(accent.value, '#0033ff');
  assert.deepEqual(accent.fallbacks, ['#00f']);
  assert.deepEqual(accent.aliases, ['#/color/base']);
});

void test('parseDesignTokens unwraps inline fallback values', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      brand: { $value: [{ $value: '#f00' }, '#0f0'] },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === 'color.brand');
  assert.ok(brand);
  assert.equal(brand.value, '#f00');
  assert.deepEqual(brand.fallbacks, ['#0f0']);
});

void test('parseDesignTokens flattens nested fallback chains', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#0033ff' },
      brand: {
        $value: [
          { $ref: '#/color/base', $fallback: [{ $value: '#222' }, '#333'] },
          '#444',
        ],
      },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === 'color.brand');
  assert.ok(brand);
  assert.equal(brand.value, '#0033ff');
  assert.deepEqual(brand.fallbacks, ['#222', '#333', '#444']);
  assert.deepEqual(brand.aliases, ['#/color/base']);
});

void test('parseDesignTokens attaches overrides to target tokens', () => {
  const tokens: DesignTokens = {
    $overrides: [
      {
        $token: '#/color/brand',
        $when: { theme: 'dark' },
        $ref: '#/color/base',
        $fallback: [
          {
            $ref: '#/color/alt',
            $fallback: {
              $value: {
                colorSpace: 'srgb',
                components: [0, 0, 0],
              },
            },
          },
          {
            $value: {
              colorSpace: 'srgb',
              components: [0, 0, 0],
            },
          },
        ],
      },
    ],
    color: {
      base: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.0, 0.2, 1.0],
        },
      },
      alt: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.1, 0.2, 0.3],
        },
      },
      brand: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
        },
      },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === 'color.brand');
  if (!brand) {
    assert.fail('Expected color.brand token');
  }
  const overrides = brand.overrides;
  if (!overrides) {
    assert.fail('Expected overrides for color.brand');
  }
  assert.equal(overrides.length, 1);
  const [override] = overrides;
  assert.equal(override.pointer, '#/color/brand');
  assert.equal(override.path, 'color.brand');
  assert.deepEqual(override.conditions, { theme: 'dark' });
  assert.equal(override.ref, '#/color/base');
  assert.equal(override.refPath, 'color.base');
  assert.deepEqual(override.fallback, [
    {
      ref: '#/color/alt',
      refPath: 'color.alt',
      fallback: [
        {
          value: {
            colorSpace: 'srgb',
            components: [0, 0, 0],
          },
        },
      ],
    },
    {
      value: {
        colorSpace: 'srgb',
        components: [0, 0, 0],
      },
    },
  ]);
  const aliases = brand.aliases ?? [];
  assert.ok(aliases.includes('#/color/base'));
  assert.ok(aliases.includes('#/color/alt'));
});

void test('parseDesignTokens accepts document-scoped override pointers', () => {
  const tokens: DesignTokens = {
    $overrides: [
      {
        $token: 'tokens.json#/color/brand',
        $when: { theme: 'dark' },
        $ref: './extras.json#/color/base',
      },
    ],
    color: {
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
      brand: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === 'color.brand');
  assert.ok(brand, 'Expected color.brand token');
  const overrides = brand.overrides;
  assert.ok(overrides, 'Expected overrides for color.brand');
  assert.equal(overrides.length, 1);
  const [override] = overrides;
  assert.equal(override.pointer, 'tokens.json#/color/brand');
  assert.equal(override.path, 'color.brand');
  assert.equal(override.ref, './extras.json#/color/base');
  assert.equal(override.refPath, 'color.base');
  const aliases = brand.aliases ?? [];
  assert.ok(aliases.includes('#/color/base'));
});

void test('parseDesignTokens validates override fallback values', () => {
  const tokens: DesignTokens = {
    $overrides: [
      {
        $token: '#/spacing/tight',
        $when: { theme: 'tight' },
        $fallback: [
          {
            $value: {
              dimensionType: 'length',
              value: 4,
              unit: '1px',
            },
          },
        ],
      },
    ],
    spacing: {
      base: {
        $type: 'dimension',
        $value: {
          dimensionType: 'length',
          value: 4,
          unit: 'px',
        },
      },
      tight: {
        $type: 'dimension',
        $value: {
          dimensionType: 'length',
          value: 4,
          unit: 'px',
        },
      },
    },
  };

  assert.throws(() => parseDesignTokens(tokens), /invalid dimension value/i);
});

void test('parseDesignTokens rejects overrides referencing unknown tokens', () => {
  const tokens: DesignTokens = {
    $overrides: [
      {
        $token: '#/color/missing',
        $when: { theme: 'dark' },
        $ref: '#/color/base',
      },
    ],
    color: {
      base: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0, 0, 0],
        },
      },
    },
  };

  assert.throws(() => parseDesignTokens(tokens), /unknown token/i);
});

void test('parseDesignTokens warns on override references with mismatched types', () => {
  const tokens: DesignTokens = {
    $overrides: [
      {
        $token: '#/color/brand',
        $when: { theme: 'contrast' },
        $ref: '#/spacing/base',
      },
    ],
    color: {
      brand: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 1, 1],
        },
      },
    },
    spacing: {
      base: {
        $type: 'dimension',
        $value: {
          dimensionType: 'length',
          value: 4,
          unit: 'px',
        },
      },
    },
  };

  const warnings: string[] = [];
  const result = parseDesignTokens(tokens, undefined, {
    onWarn: (msg) => warnings.push(msg),
  });
  const brand = result.find((t) => t.path === 'color.brand');
  if (!brand) {
    assert.fail('Expected color.brand token');
  }
  const overrides = brand.overrides;
  assert.ok(overrides);
  assert.equal(overrides.length, 1);
  const aliases = brand.aliases ?? [];
  assert.ok(aliases.includes('#/spacing/base'));
  assert.ok(warnings.some((msg) => /mismatched \$type/i.test(msg)));
});

void test('parseDesignTokens normalizes fallback colors when colorSpace option provided', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      accent: {
        $value: ['rgb(255 0 0)', 'rgb(0 0 255)'],
      },
    },
  };

  const result = parseDesignTokens(tokens, undefined, { colorSpace: 'hex' });
  const accent = result.find((t) => t.path === 'color.accent');
  assert.ok(accent);
  assert.equal(accent.value, '#ff0000');
  assert.deepEqual(accent.fallbacks, ['#0000ff']);
});

void test('parseDesignTokens rejects out-of-range hsl components', () => {
  const tokens = {
    color: {
      $type: 'color',
      bad: {
        $value: { colorSpace: 'hsl', components: [360, 101, -1] },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid color value/i);
});

void test('parseDesignTokens rejects out-of-range hwb components', () => {
  const tokens = {
    color: {
      $type: 'color',
      bad: {
        $value: { colorSpace: 'hwb', components: [361, -1, 101] },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid color value/i);
});

void test('parseDesignTokens rejects tokens with mismatched $type and value', () => {
  const tokens = {
    color: { $type: 'color', bad: { $value: 123 as unknown as string } },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid color value/i);
});

void test('parseDesignTokens handles aliases with mismatched types', () => {
  const tokens = {
    color: { base: { $value: '#00f', $type: 'color' } },
    size: {
      sm: {
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
        $type: 'dimension',
      },
    },
    alias: { wrong: { $type: 'color', $ref: '#/size/sm' } },
  } as unknown as DesignTokens;

  const result = parseDesignTokens(tokens);
  const wrong = result.find((t) => t.path === 'alias.wrong');
  assert.ok(wrong);
  assert.equal(wrong.value, undefined);
  assert.equal(wrong.ref, '#/size/sm');
  assert.deepEqual(wrong.aliases, ['#/size/sm']);
});

void test('parseDesignTokens resolves alias token types', () => {
  const tokens: DesignTokens = {
    color: {
      blue: { $value: '#00f', $type: 'color' },
      brand: { $ref: '#/color/blue' },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result.find((t) => t.path === 'color.brand')?.type, 'color');
});

void test('parseDesignTokens validates dimension tokens', () => {
  const tokens = {
    size: {
      $type: 'dimension',
      sm: { $value: { dimensionType: 'length', value: 4, unit: 'px' } },
      angle: { $value: { dimensionType: 'angle', value: 90, unit: 'deg' } },
      resolution: {
        $value: { dimensionType: 'resolution', value: 2, unit: 'dppx' },
      },
      vendor: {
        $value: {
          dimensionType: 'custom',
          value: 1,
          unit: 'acme.spacing.sm',
        },
      },
    },
  } as unknown as DesignTokens;
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].type, 'dimension');
  assert.ok(result.some((t) => t.path === 'size.angle'));
  assert.ok(result.some((t) => t.path === 'size.resolution'));
  assert.ok(result.some((t) => t.path === 'size.vendor'));

  const invalid = {
    size: { $type: 'dimension', sm: { $value: { value: 0 } } },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid dimension value/i);

  const badUnit = {
    size: {
      $type: 'dimension',
      sm: { $value: { dimensionType: 'length', value: 1, unit: '1px' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(badUnit), /invalid dimension value/i);

  const invalidFontScale = {
    size: {
      $type: 'dimension',
      sm: {
        $value: {
          dimensionType: 'angle',
          value: 1,
          unit: 'deg',
          fontScale: true,
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(invalidFontScale),
    /invalid dimension value/i,
  );
});

void test('parseDesignTokens validates duration tokens', () => {
  const tokens = {
    durations: {
      $type: 'duration',
      fast: {
        $value: {
          durationType: 'css.transition-duration',
          value: 100,
          unit: 'ms',
        },
      },
    },
  } as unknown as DesignTokens;
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].type, 'duration');

  const invalid = {
    durations: {
      $type: 'duration',
      bad: {
        $value: {
          durationType: 'css.transition-duration',
          value: 1,
          unit: 'min',
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid duration value/i);
});

void test('parseDesignTokens validates cubicBezier tokens', () => {
  const tokens: DesignTokens = {
    easing: { $type: 'cubicBezier', ease: { $value: [0.25, 0.1, 0.25, 1] } },
  } as unknown as DesignTokens;
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].type, 'cubicBezier');

  const invalid = {
    easing: { $type: 'cubicBezier', bad: { $value: [0, 0, 1] } },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid cubicBezier value/i);
});
void test('parseDesignTokens inherits types from parent groups', () => {
  const tokens: DesignTokens = {
    theme: {
      $type: 'color',
      brand: { $value: '#00f' },
      nested: {
        accent: { $value: '#f0f' },
        size: {
          $type: 'dimension',
          sm: { $value: { dimensionType: 'length', value: 4, unit: 'px' } },
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result.find((t) => t.path === 'theme.brand')?.type, 'color');
  assert.equal(
    result.find((t) => t.path === 'theme.nested.accent')?.type,
    'color',
  );
  assert.equal(
    result.find((t) => t.path === 'theme.nested.size.sm')?.type,
    'dimension',
  );
});

void test('parseDesignTokens rejects unknown aliases', () => {
  const tokens = {
    color: {
      $type: 'color',
      brand: { $ref: '#/color/missing' },
    },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(tokens),
    /references unknown token via \$ref/i,
  );
});

void test('parseDesignTokens rejects circular aliases', () => {
  const tokens = {
    color: {
      base: { $value: '#00f', $type: 'color' },
      a: { $ref: '#/color/b' },
      b: { $ref: '#/color/a' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /circular \$ref reference/i);
});

void test('normalizeTokens errors when alias target lacks type', () => {
  const tokens: FlattenedToken[] = [
    {
      path: 'size.base',
      pointer: '#/size/base',
      value: { dimensionType: 'length', value: 4, unit: 'px' },
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'size.alias',
      pointer: '#/size/alias',
      value: undefined,
      ref: '#/size/base',
      metadata: { loc: { line: 1, column: 1 } },
    },
  ];
  assert.throws(
    () => normalizeTokens(tokens),
    /references token without \$?type/i,
  );
});

void test('normalizeTokens errors when alias target lacks value', () => {
  const tokens: FlattenedToken[] = [
    {
      path: 'color.base',
      pointer: '#/color/base',
      type: 'color',
      value: undefined,
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'color.alias',
      pointer: '#/color/alias',
      value: undefined,
      ref: '#/color/base',
      metadata: { loc: { line: 1, column: 1 } },
    },
  ];
  assert.throws(
    () => normalizeTokens(tokens),
    /references token without \$?value/i,
  );
});

void test('parseDesignTokens rejects invalid $ref fragments', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $ref: 'color/base' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid \$ref/i);
});

void test('parseDesignTokens resolves alias chains', () => {
  const tokens: DesignTokens = {
    color: {
      base: { $value: '#00f', $type: 'color' },
      mid: { $ref: '#/color/base' },
      top: { $ref: '#/color/mid' },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result.find((t) => t.path === 'color.top')?.type, 'color');
});

void test('parseDesignTokens rejects circular aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $ref: '#/color/b' },
      b: { $ref: '#/color/a' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /circular \$ref reference/i);
});

void test('parseDesignTokens rejects alias chains with unknown targets', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $ref: '#/color/b' },
      b: { $ref: '#/color/missing' },
    },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(tokens),
    /references unknown token via \$ref/i,
  );
});

void test('parseDesignTokens rejects alias chains when final target lacks $type', () => {
  const tokens = {
    a: { $ref: '#/b' },
    b: { $value: '#00f' },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(tokens),
    /references token without \$?type/i,
  );
});

void test('parseDesignTokens allows pure aliases to omit $type', () => {
  const tokens = {
    a: { $ref: '#/b' },
    b: { $type: 'color', $value: '#00f' },
  } as unknown as DesignTokens;
  const result = parseDesignTokens(tokens);
  const a = result.find((t) => t.path === 'a');
  assert.ok(a);
  assert.equal(a.type, 'color');
});

void test('parseDesignTokens requires $type when $value contains braces with other text', () => {
  const tokens = {
    a: { $value: '{b} extra' },
    b: { $type: 'color', $value: '#00f' },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /missing \$type/i);
});

void test('parseDesignTokens validates shadow composite tokens', () => {
  const tokens: DesignTokens = {
    size: {
      $type: 'dimension',
      sm: { $value: { dimensionType: 'length', value: 1, unit: 'px' } },
    },
    shadow: {
      $type: 'shadow',
      small: {
        $value: {
          color: '#000',
          offsetX: { $ref: '#/size/sm' },
          offsetY: { $ref: '#/size/sm' },
          blur: { dimensionType: 'length', value: 2, unit: 'px' },
          spread: { dimensionType: 'length', value: 0, unit: 'px' },
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result.find((t) => t.path === 'shadow.small')?.type, 'shadow');

  const invalid = {
    shadow: {
      $type: 'shadow',
      bad: { $value: { color: '#000' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid dimension value/i);
});

void test('parseDesignTokens rejects shadow tokens missing spread', () => {
  const tokens = {
    shadow: {
      $type: 'shadow',
      bad: {
        $value: {
          color: '#000',
          offsetX: { dimensionType: 'length', value: 1, unit: 'px' },
          offsetY: { dimensionType: 'length', value: 1, unit: 'px' },
          blur: { dimensionType: 'length', value: 1, unit: 'px' },
        },
      },
    },
  } as unknown as DesignTokens;

  assert.throws(() => parseDesignTokens(tokens), /invalid dimension value/i);
});

void test('parseDesignTokens rejects shadow tokens with unknown properties', () => {
  const tokens = {
    shadow: {
      $type: 'shadow',
      bad: {
        $value: {
          color: '#000',
          offsetX: { dimensionType: 'length', value: 1, unit: 'px' },
          offsetY: { dimensionType: 'length', value: 1, unit: 'px' },
          blur: { dimensionType: 'length', value: 1, unit: 'px' },
          foo: 1,
        },
      },
    },
  } as unknown as DesignTokens;

  assert.throws(() => parseDesignTokens(tokens), /invalid shadow value/i);
});

void test('parseDesignTokens validates strokeStyle composite tokens', () => {
  const tokens: DesignTokens = {
    stroke: {
      $type: 'strokeStyle',
      dashed: { $value: 'dashed' },
      custom: {
        $value: {
          dashArray: [{ dimensionType: 'length', value: 1, unit: 'px' }],
          lineCap: 'round',
        },
      },
      empty: {
        $value: {
          dashArray: [],
          lineCap: 'round',
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'stroke.custom')?.type,
    'strokeStyle',
  );
  assert.equal(
    result.find((t) => t.path === 'stroke.empty')?.type,
    'strokeStyle',
  );

  const invalid = {
    stroke: {
      $type: 'strokeStyle',
      bad: { $value: { dashArray: [], lineCap: 'foo' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid strokeStyle value/i);
});

void test('parseDesignTokens rejects strokeStyle tokens with unknown properties', () => {
  const tokens = {
    stroke: {
      $type: 'strokeStyle',
      bad: {
        $value: {
          dashArray: [{ dimensionType: 'length', value: 1, unit: 'px' }],
          lineCap: 'round',
          foo: 1,
        },
      },
    },
  } as unknown as DesignTokens;

  assert.throws(() => parseDesignTokens(tokens), /invalid strokeStyle value/i);
});

void test('parseDesignTokens validates gradient composite tokens', () => {
  const tokens: DesignTokens = {
    gradient: {
      $type: 'gradient',
      primary: {
        $value: [
          { color: '#000', position: 0 },
          { color: '#fff', position: 1 },
        ],
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'gradient.primary')?.type,
    'gradient',
  );

  const invalid = {
    gradient: {
      $type: 'gradient',
      bad: { $value: [{ color: '#000' }] },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid gradient value/i);
});

void test('parseDesignTokens rejects gradients with fewer than two stops', () => {
  const tokens = {
    gradient: {
      $type: 'gradient',
      bad: { $value: [{ color: '#000', position: 0 }] },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid gradient value/i);
});

void test('parseDesignTokens rejects gradient tokens with unknown properties', () => {
  const tokens = {
    gradient: {
      $type: 'gradient',
      bad: { $value: [{ color: '#000', position: 0, foo: 1 }] },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid gradient value/i);
});

void test('parseDesignTokens resolves aliases inside gradient stops', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      dark: { $value: '#000' },
    },
    gradient: {
      $type: 'gradient',
      hero: {
        $value: [
          { color: { $ref: '#/color/base' }, position: 0 },
          { color: { $ref: '#/color/dark' }, position: 1 },
        ],
      },
    },
  };
  const result = parseDesignTokens(tokens);
  const grad = result.find((t) => t.path === 'gradient.hero');
  assert(grad);
  assert.deepEqual(grad.value, [
    { color: '#fff', position: 0 },
    { color: '#000', position: 1 },
  ]);
  assert.deepEqual(grad.aliases, ['#/color/base', '#/color/dark']);
});

void test('parseDesignTokens clamps gradient stop positions to [0,1]', () => {
  const tokens: DesignTokens = {
    gradient: {
      $type: 'gradient',
      clamp: {
        $value: [
          { color: '#000', position: -1 },
          { color: '#fff', position: 2 },
        ],
      },
    },
  };
  const result = parseDesignTokens(tokens);
  const grad = result.find((t) => t.path === 'gradient.clamp');
  assert(grad);
  assert.deepEqual(grad.value, [
    { color: '#000', position: 0 },
    { color: '#fff', position: 1 },
  ]);
});

void test('parseDesignTokens validates border composite tokens', () => {
  const tokens: DesignTokens = {
    border: {
      $type: 'border',
      thin: {
        $value: {
          color: '#000',
          width: { dimensionType: 'length', value: 1, unit: 'px' },
          style: 'solid',
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(result.find((t) => t.path === 'border.thin')?.type, 'border');

  const invalid = {
    border: {
      $type: 'border',
      bad: {
        $value: {
          color: '#000',
          width: { dimensionType: 'length', value: 1, unit: 'px' },
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid border value/i);
});

void test('parseDesignTokens validates transition composite tokens', () => {
  const tokens: DesignTokens = {
    transition: {
      $type: 'transition',
      fade: {
        $value: {
          duration: {
            durationType: 'css.transition-duration',
            value: 1,
            unit: 's',
          },
          delay: {
            durationType: 'css.transition-delay',
            value: 0,
            unit: 's',
          },
          timingFunction: [0, 0, 1, 1],
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'transition.fade')?.type,
    'transition',
  );

  const invalid = {
    transition: {
      $type: 'transition',
      bad: {
        $value: {
          duration: {
            durationType: 'css.transition-duration',
            value: 1,
            unit: 's',
          },
          delay: {
            durationType: 'css.transition-delay',
            value: 0,
            unit: 's',
          },
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid transition value/i);
});

void test('parseDesignTokens resolves aliases inside shadow segments', () => {
  const tokens: DesignTokens = {
    color: { $type: 'color', shadow: { $value: '#00000080' } },
    shadow: {
      $type: 'shadow',
      subtle: {
        $value: [
          {
            color: { $ref: '#/color/shadow' },
            offsetX: { dimensionType: 'length', value: 0, unit: 'px' },
            offsetY: { dimensionType: 'length', value: 1, unit: 'px' },
            blur: { dimensionType: 'length', value: 2, unit: 'px' },
            spread: { dimensionType: 'length', value: 0, unit: 'px' },
          },
        ],
      },
    },
  };
  const result = parseDesignTokens(tokens);
  const subtle = result.find((t) => t.path === 'shadow.subtle');
  assert(subtle);
  assert.deepEqual(subtle.value, [
    {
      color: '#00000080',
      offsetX: { dimensionType: 'length', value: 0, unit: 'px' },
      offsetY: { dimensionType: 'length', value: 1, unit: 'px' },
      blur: { dimensionType: 'length', value: 2, unit: 'px' },
      spread: { dimensionType: 'length', value: 0, unit: 'px' },
    },
  ]);
  assert.deepEqual(subtle.aliases, ['#/color/shadow']);
});

void test('parseDesignTokens validates typography composite tokens', () => {
  const tokens: DesignTokens = {
    typography: {
      $type: 'typography',
      body: {
        $value: {
          fontFamily: 'Arial',
          fontSize: { dimensionType: 'length', value: 16, unit: 'px' },
          fontWeight: 400,
          letterSpacing: { dimensionType: 'length', value: 0, unit: 'px' },
          lineHeight: 1.5,
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'typography.body')?.type,
    'typography',
  );

  const invalid = {
    typography: {
      $type: 'typography',
      bad: { $value: { fontFamily: 'Arial' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid typography value/i);

  const missingLetterSpacing = {
    typography: {
      $type: 'typography',
      bad: {
        $value: {
          fontFamily: 'Arial',
          fontSize: { dimensionType: 'length', value: 16, unit: 'px' },
          fontWeight: 400,
          lineHeight: 1.5,
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(
    () => parseDesignTokens(missingLetterSpacing),
    /invalid typography value/i,
  );
});

void test('parseDesignTokens rejects typography tokens with unknown properties', () => {
  const tokens = {
    typography: {
      $type: 'typography',
      bad: {
        $value: {
          fontFamily: 'Arial',
          fontSize: { dimensionType: 'length', value: 16, unit: 'px' },
          fontWeight: 400,
          letterSpacing: { dimensionType: 'length', value: 0, unit: 'px' },
          lineHeight: 1.5,
          foo: 1,
        },
      },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid typography value/i);
});

void test('parseDesignTokens preserves $extensions and $deprecated metadata', () => {
  const ext = { 'org.example.tool': { flag: true } };
  const tokens: DesignTokens = {
    theme: {
      $type: 'color',
      $deprecated: true,
      brand: { $value: '#000', $extensions: ext },
      active: { $value: '#fff', $deprecated: false },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.find((t) => t.path === 'theme.brand')?.metadata.extensions,
    ext,
  );
  assert.equal(
    result.find((t) => t.path === 'theme.brand')?.metadata.deprecated,
    true,
  );
  assert.equal(
    result.find((t) => t.path === 'theme.active')?.metadata.deprecated,
    false,
  );
});

void test('parseDesignTokens warns on $extensions keys without dot', () => {
  const tokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f', $extensions: { foo: 1 } },
    },
  } as unknown as DesignTokens;
  const warnings: string[] = [];
  parseDesignTokens(tokens, undefined, { onWarn: (msg) => warnings.push(msg) });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\$extensions key without a dot/);
});

void test('parseDesignTokens rejects invalid $deprecated values', () => {
  const tokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f', $deprecated: 123 as unknown as boolean },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid \$deprecated/i);
});

void test('parseDesignTokens rejects invalid $description on token', () => {
  const tokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f', $description: 123 as unknown as string },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid \$description/i);
});

void test('parseDesignTokens rejects invalid $description on group', () => {
  const tokens = {
    $description: 123 as unknown as string,
    color: { blue: { $type: 'color', $value: '#00f' } },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid \$description/i);
});

void test('parseDesignTokens validates DTIF documents with schema', () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      brand: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
    },
  };
  assert.doesNotThrow(() => parseDesignTokens(tokens));
});

void test('parseDesignTokens surfaces DTIF schema violations', () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      brand: { $type: 'color', $value: '#00f' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /DTIF validation failed/);
});

void test('parseDesignTokens rejects malformed color values', () => {
  const tokens: DesignTokens = {
    color: { $type: 'color', bad: { $value: '#zzzzzz' } },
  };
  assert.throws(() => parseDesignTokens(tokens), /invalid color value/i);
});

void test('parseDesignTokens normalizes colors to rgb when configured', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      green: {
        $value: { colorSpace: 'hsl', components: [120, 100, 50] },
      },
    },
  };
  const result = parseDesignTokens(tokens, undefined, { colorSpace: 'rgb' });
  assert.equal(result[0].value, 'rgb(0, 255, 0)');
});

void test('parseDesignTokens normalizes hwb colors to hex when configured', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      green: {
        $value: { colorSpace: 'hwb', components: [120, 0, 0] },
      },
    },
  };
  const result = parseDesignTokens(tokens, undefined, { colorSpace: 'hex' });
  assert.equal(result[0].value, '#00ff00');
});

void test('parseDesignTokens applies custom transforms', () => {
  const legacy = {
    color: { blue: { value: '#00f', type: 'color' } },
  } as unknown as DesignTokens;

  const transform: TokenTransform = (tokens) => {
    function walk(node: unknown): unknown {
      if (typeof node !== 'object' || node === null) return node;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        const newKey =
          key === 'value' ? '$value' : key === 'type' ? '$type' : key;
        result[newKey] = walk(value);
      }
      return result;
    }
    return walk(tokens) as DesignTokens;
  };

  assert.throws(() => parseDesignTokens(legacy));
  const parsed = parseDesignTokens(legacy, undefined, {
    transforms: [transform],
  });
  assert.equal(parsed[0].path, 'color.blue');
});

void test('registerTokenTransform applies transforms globally', () => {
  const legacy = {
    color: { red: { value: '#f00', type: 'color' } },
  } as unknown as DesignTokens;

  const unregister = registerTokenTransform((tokens) => {
    function walk(node: unknown): unknown {
      if (typeof node !== 'object' || node === null) return node;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        const newKey =
          key === 'value' ? '$value' : key === 'type' ? '$type' : key;
        result[newKey] = walk(value);
      }
      return result;
    }
    return walk(tokens) as DesignTokens;
  });

  const parsed = parseDesignTokens(legacy);
  unregister();
  assert.equal(parsed[0].path, 'color.red');
});
