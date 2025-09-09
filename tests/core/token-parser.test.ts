import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDesignTokens } from '../../src/core/token-parser.ts';
import { parseDesignTokensFile } from '../../src/adapters/node/token-parser.ts';
import type { DesignTokens } from '../../src/core/types.js';

void test('parseDesignTokens flattens tokens with paths in declaration order', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f' },
      red: { $value: '#f00' },
    },
    spacing: {
      $type: 'dimension',
      sm: { $value: { value: 4, unit: 'px' } },
    },
  };

  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.map((t) => t.path),
    ['color.blue', 'color.red', 'spacing.sm'],
  );
});

void test('parseDesignTokens rejects duplicate names differing only by case', () => {
  const tokens = {
    color: {
      Blue: { $value: '#00f' },
      blue: { $value: '#00f' },
    },
  } as unknown as DesignTokens;

  assert.throws(() => parseDesignTokens(tokens), /differing only by case/i);
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
  assert.deepEqual(result[0], {
    path: 'color.blue',
    token: { $value: '#00f', $type: 'color' },
  });
});

void test('parseDesignTokens rejects tokens missing explicit type', () => {
  const tokens = { foo: { $value: 1 } } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /missing \$type/i);
});

void test('parseDesignTokens resolves alias token types', () => {
  const tokens: DesignTokens = {
    color: {
      blue: { $value: '#00f', $type: 'color' },
      brand: { $value: '{color.blue}' },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'color.brand')?.token.$type,
    'color',
  );
});

void test('parseDesignTokens validates dimension tokens', () => {
  const tokens = {
    size: { $type: 'dimension', sm: { $value: { value: 4, unit: 'px' } } },
  } as unknown as DesignTokens;
  const result = parseDesignTokens(tokens);
  assert.equal(result[0].token.$type, 'dimension');

  const invalid = {
    size: { $type: 'dimension', sm: { $value: { value: 0 } } },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid dimension value/i);
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
          sm: { $value: { value: 4, unit: 'px' } },
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'theme.brand')?.token.$type,
    'color',
  );
  assert.equal(
    result.find((t) => t.path === 'theme.nested.accent')?.token.$type,
    'color',
  );
  assert.equal(
    result.find((t) => t.path === 'theme.nested.size.sm')?.token.$type,
    'dimension',
  );
});

void test('parseDesignTokens rejects aliases referencing unknown tokens', () => {
  const tokens = {
    color: {
      $type: 'color',
      brand: { $value: '{color.missing}' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /references unknown token/i);
});

void test('parseDesignTokens resolves alias chains', () => {
  const tokens: DesignTokens = {
    color: {
      base: { $value: '#00f', $type: 'color' },
      mid: { $value: '{color.base}' },
      top: { $value: '{color.mid}' },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'color.top')?.token.$type,
    'color',
  );
});

void test('parseDesignTokens detects circular aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $value: '{color.b}' },
      b: { $value: '{color.a}' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /circular alias/i);
});

void test('parseDesignTokens rejects alias chains with unknown targets', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $value: '{color.b}' },
      b: { $value: '{color.missing}' },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /references unknown token/i);
});

void test('parseDesignTokens rejects alias chains when final target lacks $type', () => {
  const tokens = {
    a: { $value: '{b}' },
    b: { $value: '#00f' },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /without \$type/i);
});

void test('parseDesignTokens validates shadow composite tokens', () => {
  const tokens: DesignTokens = {
    size: { $type: 'dimension', sm: { $value: { value: 1, unit: 'px' } } },
    shadow: {
      $type: 'shadow',
      small: {
        $value: {
          color: '#000',
          offsetX: '{size.sm}',
          offsetY: '{size.sm}',
          blur: { value: 2, unit: 'px' },
          spread: { value: 0, unit: 'px' },
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'shadow.small')?.token.$type,
    'shadow',
  );

  const invalid = {
    shadow: {
      $type: 'shadow',
      bad: { $value: { color: '#000' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid dimension value/i);
});

void test('parseDesignTokens validates strokeStyle composite tokens', () => {
  const tokens: DesignTokens = {
    stroke: {
      $type: 'strokeStyle',
      dashed: { $value: 'dashed' },
      custom: {
        $value: {
          dashArray: [{ value: 1, unit: 'px' }],
          lineCap: 'round',
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'stroke.custom')?.token.$type,
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
    result.find((t) => t.path === 'gradient.primary')?.token.$type,
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

void test('parseDesignTokens validates typography composite tokens', () => {
  const tokens: DesignTokens = {
    typography: {
      $type: 'typography',
      body: {
        $value: {
          fontFamily: 'Arial',
          fontSize: { value: 16, unit: 'px' },
          fontWeight: 400,
          lineHeight: 1.5,
        },
      },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.equal(
    result.find((t) => t.path === 'typography.body')?.token.$type,
    'typography',
  );

  const invalid = {
    typography: {
      $type: 'typography',
      bad: { $value: { fontFamily: 'Arial' } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(invalid), /invalid typography value/i);
});

void test('parseDesignTokens preserves $extensions and $deprecated metadata', () => {
  const ext = { 'org.example.tool': { flag: true } };
  const tokens: DesignTokens = {
    theme: {
      $type: 'color',
      $deprecated: 'use new theme',
      brand: { $value: '#000', $extensions: ext },
      active: { $value: '#fff', $deprecated: false },
    },
  };
  const result = parseDesignTokens(tokens);
  assert.deepEqual(
    result.find((t) => t.path === 'theme.brand')?.token.$extensions,
    ext,
  );
  assert.equal(
    result.find((t) => t.path === 'theme.brand')?.token.$deprecated,
    'use new theme',
  );
  assert.equal(
    result.find((t) => t.path === 'theme.active')?.token.$deprecated,
    false,
  );
});

void test('parseDesignTokens rejects invalid $extensions keys', () => {
  const tokens = {
    color: {
      $type: 'color',
      blue: { $value: '#00f', $extensions: { foo: 1 } },
    },
  } as unknown as DesignTokens;
  assert.throws(() => parseDesignTokens(tokens), /invalid \$extensions key/i);
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
