import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getTokenLocation,
  parseDesignTokens,
  registerTokenTransform,
  type TokenTransform,
} from '../../src/core/parser/index.js';
import {
  parseDesignTokensFile,
  TokenParseError,
} from '../../src/adapters/node/token-parser.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('parseDesignTokens flattens tokens with JSON Pointer paths in declaration order', () => {
  const tokens: DesignTokens = {
    palette: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.333, 1] },
      },
      secondary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0.2, 0] },
      },
    },
    spacing: {
      sm: { $type: 'dimension', $value: { value: 4, unit: 'px' } },
    },
  };

  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.map((t) => t.path),
    ['/palette/primary', '/palette/secondary', '/spacing/sm'],
  );
  assert.deepEqual(
    result.map((t) => t.type),
    ['color', 'color', 'dimension'],
  );
});

void test('parseDesignTokens inherits nested collection types', () => {
  const tokens: DesignTokens = {
    theme: {
      brand: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.066, 0.133, 0.2] },
      },
      nested: {
        accents: {
          highlight: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0.2, 0.333, 0.466] },
          },
        },
        spacing: {
          tight: { $type: 'dimension', $value: { value: 2, unit: 'px' } },
        },
      },
    },
  };

  const result = parseDesignTokens(tokens);
  const brand = result.find((t) => t.path === '/theme/brand');
  assert.equal(brand?.type, 'color');
  const highlight = result.find(
    (t) => t.path === '/theme/nested/accents/highlight',
  );
  assert.equal(highlight?.type, 'color');
  const tight = result.find((t) => t.path === '/theme/nested/spacing/tight');
  assert.equal(tight?.type, 'dimension');
});

void test('parseDesignTokens records metadata, deprecated inheritance, and locations', () => {
  const tokens: DesignTokens = {
    palette: {
      $type: 'color',
      $deprecated: { $replacement: '/palette/brand' },
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        $description: 'Base color',
        $extensions: { 'example.tool': { token: true } },
      },
      brand: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        $deprecated: false,
      },
    },
  };

  const locations = new Map([
    ['/palette/base', { line: 4, column: 7 }],
    ['/palette/brand', { line: 8, column: 3 }],
  ]);

  const result = parseDesignTokens(
    tokens,
    (pointer) => locations.get(pointer) ?? { line: 1, column: 1 },
  );

  const base = result.find((t) => t.path === '/palette/base');
  assert(base);
  assert.equal(base.metadata.description, 'Base color');
  assert.deepEqual(base.metadata.extensions, {
    'example.tool': { token: true },
  });
  assert.deepEqual(base.metadata.deprecated, {
    $replacement: '/palette/brand',
  });
  assert.deepEqual(base.metadata.loc, { line: 4, column: 7 });

  const brand = result.find((t) => t.path === '/palette/brand');
  assert(brand);
  assert.equal(brand.metadata.deprecated, false);
  assert.deepEqual(brand.metadata.loc, { line: 8, column: 3 });

  assert.deepEqual(getTokenLocation('/palette/base'), { line: 4, column: 7 });
});

void test('parseDesignTokens resolves $ref aliases and collects canonical pointers', () => {
  const tokens: DesignTokens = {
    palette: {
      $type: 'color',
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
      brand: { $ref: '/palette/base' },
    },
  };

  const result = parseDesignTokens(tokens);
  const base = result.find((t) => t.path === '/palette/base');
  assert(base);
  assert.deepEqual(base.value, {
    colorSpace: 'srgb',
    components: [1, 1, 1],
  });
  assert.equal(base.type, 'color');

  const brand = result.find((t) => t.path === '/palette/brand');
  assert(brand);
  assert.deepEqual(brand.value, {
    colorSpace: 'srgb',
    components: [1, 1, 1],
  });
  assert.equal(brand.type, 'color');
  assert.equal(brand.ref, '/palette/base');
  assert.deepEqual(brand.aliases, ['/palette/base']);
});

void test('parseDesignTokens resolves alias chains and collects unique references', () => {
  const tokens: DesignTokens = {
    palette: {
      $type: 'color',
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.066, 0.066, 0.066] },
      },
      accent: { $ref: '/palette/base' },
      brand: { $ref: '/palette/accent' },
    },
  };

  const result = parseDesignTokens(tokens);
  const accent = result.find((t) => t.path === '/palette/accent');
  assert(accent);
  assert.equal(accent.type, 'color');
  assert.deepEqual(accent.aliases, ['/palette/base']);

  const brand = result.find((t) => t.path === '/palette/brand');
  assert(brand);
  assert.deepEqual(brand.value, {
    colorSpace: 'srgb',
    components: [0.066, 0.066, 0.066],
  });
  assert.equal(brand.type, 'color');
  assert.deepEqual(brand.aliases, ['/palette/accent', '/palette/base']);
});

void test('parseDesignTokens warns when alias type mismatches target', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
    },
    alias: {
      wrong: { $type: 'dimension', $ref: '/color/base' },
    },
  };

  const warnings: string[] = [];
  const result = parseDesignTokens(tokens, undefined, {
    onWarn: (msg) => warnings.push(msg),
  });

  const wrong = result.find((t) => t.path === '/alias/wrong');
  assert(wrong);
  assert.equal(wrong.type, 'dimension');
  assert.ok(
    warnings.some((msg) =>
      msg.includes(
        'Token /alias/wrong declares type dimension but resolves to color',
      ),
    ),
  );
});

void test('parseDesignTokens warns on duplicate names differing only by case', () => {
  const tokens = {
    palette: {
      $type: 'color',
      Blue: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.333, 1] },
      },
      blue: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.333, 1] },
      },
    },
  } as unknown as DesignTokens;

  const warnings: string[] = [];
  const result = parseDesignTokens(tokens, undefined, {
    onWarn: (msg) => warnings.push(msg),
  });

  assert.equal(result.length, 2);
  assert.ok(warnings.some((msg) => msg.includes('differ only by case')));
});

void test('parseDesignTokens throws on invalid JSON Pointer aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
      primary: { $ref: 'color/base' },
    },
  };

  assert.throws(() => parseDesignTokens(tokens), /invalid \$ref/i);
});

void test('parseDesignTokens throws on unknown alias targets', () => {
  const tokens: DesignTokens = {
    color: {
      base: { $ref: '/color/missing' },
    },
  };

  assert.throws(() => parseDesignTokens(tokens), /references unknown token/i);
});

void test('parseDesignTokens throws on circular alias chains', () => {
  const tokens: DesignTokens = {
    color: {
      a: { $ref: '/color/b' },
      b: { $ref: '/color/a' },
    },
  };

  assert.throws(() => parseDesignTokens(tokens), /circular \$ref chain/i);
});

void test('parseDesignTokensFile reads a .dtif.json token file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'theme.dtif.json');
  const tokens: DesignTokens = {
    spacing: {
      sm: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
    },
  };
  await writeFile(file, JSON.stringify(tokens), 'utf8');

  const result = await parseDesignTokensFile(file);
  const token = result.find((t) => t.path === '/spacing/sm');
  assert(token);
  assert.deepEqual(token.value, {
    dimensionType: 'length',
    value: 4,
    unit: 'px',
  });
  assert.equal(token.type, 'dimension');
  assert.equal(typeof token.metadata.loc.line, 'number');
  assert.equal(typeof token.metadata.loc.column, 'number');
});

void test('parseDesignTokensFile reports DTIF schema violations', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'invalid.dtif.json');
  const invalid = {
    color: { swatch: { $type: 'color' } },
  } as unknown as DesignTokens;
  await writeFile(file, JSON.stringify(invalid), 'utf8');

  await assert.rejects(
    () => parseDesignTokensFile(file),
    (error: unknown) => {
      assert.ok(error instanceof TokenParseError);
      assert.ok(error.message.includes('DTIF validation failed'));
      assert.ok(error.format().includes(file));
      return true;
    },
  );
});

void test('parseDesignTokensFile reports location on parse error', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokens-'));
  const file = path.join(dir, 'bad.dtif.json');
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

void test('parseDesignTokens applies transforms passed via options', () => {
  const legacy = {
    color: { blue: { value: '#00f', type: 'color' } },
  } as unknown as DesignTokens;

  const transform: TokenTransform = (tokens) => {
    function walk(node: unknown): unknown {
      if (typeof node !== 'object' || node === null) return node;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        const mapped =
          key === 'value' ? '$value' : key === 'type' ? '$type' : key;
        result[mapped] = walk(value);
      }
      return result;
    }
    return walk(tokens) as DesignTokens;
  };

  const withoutTransform = parseDesignTokens(legacy);
  assert.equal(withoutTransform.length, 0);

  const parsed = parseDesignTokens(legacy, undefined, {
    transforms: [transform],
  });
  assert.deepEqual(
    parsed.map((t) => t.path),
    ['/color/blue'],
  );
  assert.equal(parsed[0]?.type, 'color');
});

void test('registerTokenTransform applies transforms globally', () => {
  const legacy = {
    color: { red: { value: '#f00', type: 'color' } },
  } as unknown as DesignTokens;

  const transform: TokenTransform = (tokens) => {
    function walk(node: unknown): unknown {
      if (typeof node !== 'object' || node === null) return node;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        const mapped =
          key === 'value' ? '$value' : key === 'type' ? '$type' : key;
        result[mapped] = walk(value);
      }
      return result;
    }
    return walk(tokens) as DesignTokens;
  };

  const unregister = registerTokenTransform(transform);
  try {
    const parsed = parseDesignTokens(legacy);
    assert.deepEqual(
      parsed.map((t) => t.path),
      ['/color/red'],
    );
    assert.equal(parsed[0]?.type, 'color');
  } finally {
    unregister();
  }
});
