/**
 * Unit tests for loadTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadTokens } from '../../src/config/token-loader.js';

void test('rejects legacy token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color', $value: '#000' } } }),
  );
  await assert.rejects(
    loadTokens({ light: './light.tokens.json' }, tmp),
    /Design tokens must use the DTIF format/i,
  );
});

void test('reads DTIF token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify(
      {
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [0, 0, 0],
            },
          },
        },
      },
      null,
      2,
    ),
  );
  const tokens = await loadTokens({ light: './light.tokens.json' }, tmp);
  const light = tokens.light as {
    $version: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };
  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
});

void test('propagates parsing errors', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'bad.tokens.json'),
    JSON.stringify(
      {
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
          },
        },
      },
      null,
      2,
    ),
  );
  await assert.rejects(
    loadTokens({ light: './bad.tokens.json' }, tmp),
    /DTIF/i,
  );
});

void test('includes theme when token file missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    loadTokens({ light: './missing.tokens.json' }, tmp),
    /Failed to read tokens for theme "light"/,
  );
});

void test('rejects inline legacy design tokens object', async () => {
  await assert.rejects(
    loadTokens(
      { color: { primary: { $type: 'color', $value: '#000' } } },
      process.cwd(),
    ),
    /Design tokens must use the DTIF format/i,
  );
});

void test('parses inline DTIF design tokens object', async () => {
  const tokens = await loadTokens(
    {
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.1, 0.2, 0.3],
          },
        },
        alias: { $type: 'color', $ref: '#/color/primary' },
      },
    },
    process.cwd(),
  );
  const color = tokens.color as {
    primary: {
      $value: { colorSpace: string; components: [number, number, number] };
    };
    alias: { $ref: string };
  };
  assert.deepEqual(color.primary.$value, {
    colorSpace: 'srgb',
    components: [0.1, 0.2, 0.3],
  });
  assert.equal(color.alias.$ref, '#/color/primary');
});

void test('retains metadata on inline tokens', async () => {
  const tokens = await loadTokens(
    {
      $schema: 'https://design-tokens.org',
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
    process.cwd(),
  );
  const color = tokens.color as {
    primary: {
      $value: { colorSpace: string; components: [number, number, number] };
    };
  };
  assert.deepEqual(color.primary.$value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
  const meta = tokens as { $schema: string; $version: string };
  assert.equal(meta.$schema, 'https://design-tokens.org');
  assert.equal(meta.$version, '1.0.0');
});

void test('rejects inline legacy theme record', async () => {
  await assert.rejects(
    loadTokens(
      {
        light: { color: { primary: { $type: 'color', $value: '#000' } } },
        dark: { color: { primary: { $type: 'color', $value: '#111' } } },
      },
      process.cwd(),
    ),
    /Design tokens must use the DTIF format/i,
  );
});

void test('parses inline DTIF theme record', async () => {
  const tokens = await loadTokens(
    {
      light: {
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [0.05, 0.05, 0.05],
            },
          },
        },
      },
      dark: {
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [0.1, 0.1, 0.1],
            },
          },
        },
      },
    },
    process.cwd(),
  );
  const light = tokens.light as {
    $version: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };
  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0.05, 0.05, 0.05],
  });
});

void test('merges variant tokens over default', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'base.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      $description: 'base',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
        secondary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.13, 0.13, 0.13] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, 'dark.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      $description: 'dark',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.07, 0.07, 0.07] },
        },
      },
    }),
  );
  const tokens = await loadTokens(
    { default: './base.tokens.json', dark: './dark.tokens.json' },
    tmp,
  );
  const dark = tokens.dark as {
    $description: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
      secondary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };
  assert.deepEqual(dark.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0.07, 0.07, 0.07],
  });
  assert.deepEqual(dark.color.secondary.$value, {
    colorSpace: 'srgb',
    components: [0.13, 0.13, 0.13],
  });
  assert.equal(dark.$description, 'dark');
  const base = tokens.default as {
    $description: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };
  assert.deepEqual(base.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
  assert.equal(base.$description, 'base');
});

void test('returns empty object for non-record input', async () => {
  const tokens = await loadTokens(null, process.cwd());
  assert.deepEqual(tokens, {});
});
