/**
 * Unit tests for loadConfig.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../../src/config/loader.js';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ConfigError } from '../../src/core/errors.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('returns default config when none found', async () => {
  const tmp = makeTmpDir();
  const config = await loadConfig(tmp);
  assert.deepEqual(config, {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    output: [],
    configPath: undefined,
  });
});

void test('finds config in parent directories', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: {
          primary: { $type: 'color', $value: srgb([0, 0, 0]) },
        },
      },
    }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = await loadConfig(nested);
  const tokens = loaded.tokens as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
});

void test('throws on malformed JSON config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, '{ invalid json');
  await assert.rejects(loadConfig(tmp), /JSON Error/);
});

void test('throws on malformed JS config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(configPath, 'module.exports = { tokens: {},');
  await assert.rejects(loadConfig(tmp), /Expected identifier/);
});

void test('parses nameTransform option', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: {}, nameTransform: 'PascalCase' }),
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.nameTransform, 'PascalCase');
});

void test('parses output targets', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {},
      output: [{ format: 'css', file: 'out.css' }],
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.deepEqual(loaded.output, [{ format: 'css', file: 'out.css' }]);
});

void test('rejects bare string token values', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ tokens: { color: '#000' } }));
  await assert.rejects(loadConfig(tmp), /Token file paths must be relative/);
});

void test('propagates token parsing errors', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: {
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb' },
          },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /Schema violation|DTIF4010/i);
});

void test('throws when specified config file is missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    loadConfig(tmp, 'designlint.config.json'),
    /Config file not found.*npx design-lint init/,
  );
});

void test('validates additional token groups', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        default: {
          $version: '1.0.0',
          colors: {
            primary: { $type: 'color', $value: srgb([0, 0, 0]) },
          },
          neutrals: {
            surface: { $type: 'color', $value: srgb([1, 1, 1]) },
          },
          accents: {
            success: { $type: 'color', $value: srgb([0, 1, 0]) },
          },
        },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.ok(loaded.tokens);
  const tokens = loaded.tokens as {
    colors: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
    neutrals: {
      surface: { $value: { colorSpace: string; components: number[] } };
    };
    accents: {
      success: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.colors.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.colors.primary.$value.components, [0, 0, 0]);
  assert.deepEqual(tokens.neutrals.surface.$value.components, [1, 1, 1]);
  assert.deepEqual(tokens.accents.success.$value.components, [0, 1, 0]);
});

void test('throws on invalid rule setting', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'design-token/colors': 'invalid' } }),
  );
  await assert.rejects(loadConfig(tmp), (err) => {
    assert.ok(err instanceof ConfigError);
    assert.ok(err.context.includes('designlint.config.json'));
    assert.equal(err.remediation, 'Review and fix the configuration file.');
    return err.message.includes('Invalid config');
  });
});

void test('loads config from .js using defineConfig', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  const rel = path
    .relative(tmp, path.resolve('src/config/define-config.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `const { defineConfig } = require('${rel}');\nmodule.exports = defineConfig({ tokens: { $version: '1.0.0', color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
});

void test('loads config from .ts with type annotations', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '${rel}';\nconst colours: string[] = [];\nexport default defineConfig({ tokens: { $version: '1.0.0', color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
});

void test('loads .ts config with commonjs module output', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { module: 'commonjs' } }),
  );
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '${rel}';\nexport default defineConfig({ tokens: { $version: '1.0.0', color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
});

void test('loads config when package.json type module', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { $version: '1.0.0', color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } } };",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.equal(tokens.color.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.color.primary.$value.components, [0, 0, 0]);
});

void test("rule configured as 'off' is ignored", async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
      },
      rules: { 'design-token/colors': 'off' },
    }),
  );
  const config = await loadConfig(tmp);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText('const c = "#fff";', 'file.ts');
  assert.equal(res.messages.length, 0);
});

void test('throws on unknown rule name', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'unknown/rule': 'error' } }),
  );
  const config = await loadConfig(tmp);
  const linter = initLinter(config, { documentSource: new FileSource() });
  await assert.rejects(
    () => linter.lintText('const x = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof ConfigError);
      assert.equal(err.context, 'Config.rules');
      assert.equal(err.remediation, 'Remove or correct these rule names.');
      return err.message.includes('Unknown rule(s): unknown/rule');
    },
  );
});

void test('loads config with multi-theme tokens', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        light: {
          $version: '1.0.0',
          color: { primary: { $type: 'color', $value: srgb([1, 1, 1]) } },
        },
        dark: {
          $version: '1.0.0',
          color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
        },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    light: {
      color: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
    dark: {
      color: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
  };
  assert.deepEqual(tokens.light.color.primary.$value.components, [1, 1, 1]);
  assert.deepEqual(tokens.dark.color.primary.$value.components, [0, 0, 0]);
});

void test('loads config with spec token tree', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: {
          brand: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
        },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: {
      brand: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
  };
  assert.equal(tokens.color.brand.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(tokens.color.brand.primary.$value.components, [0, 0, 0]);
});

void test('loads tokens from theme file paths', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.json' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: {
          primary: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          },
        },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: {
      brand: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
  };
  assert.equal(light.color.brand.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(light.color.brand.primary.$value.components, [0, 0, 0]);
});

void test('loads tokens from YAML theme file paths', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.yaml' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.yaml'),
    [
      '$version: 1.0.0',
      'color:',
      '  brand:',
      '    primary:',
      '      $type: color',
      '      $value:',
      '        colorSpace: srgb',
      '        components:',
      '          - 0',
      '          - 0',
      '          - 0',
    ].join('\n'),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: {
      brand: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
  };
  assert.equal(light.color.brand.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(light.color.brand.primary.$value.components, [0, 0, 0]);
});

void test('resolves token file paths relative to config', async () => {
  const tmp = makeTmpDir();
  const cfgDir = path.join(tmp, 'cfg');
  fs.mkdirSync(cfgDir);
  fs.writeFileSync(
    path.join(cfgDir, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './tokens.tokens.json' } }),
  );
  fs.writeFileSync(
    path.join(cfgDir, 'tokens.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [17 / 255, 17 / 255, 17 / 255],
            },
          },
        },
      },
    }),
  );
  const loaded = await loadConfig(
    tmp,
    path.join('cfg', 'designlint.config.json'),
  );
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: {
      brand: {
        primary: { $value: { colorSpace: string; components: number[] } };
      };
    };
  };
  assert.equal(light.color.brand.primary.$value.colorSpace, 'srgb');
  assert.deepEqual(light.color.brand.primary.$value.components, [
    17 / 255,
    17 / 255,
    17 / 255,
  ]);
});

void test('surfaces errors thrown by ts config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  fs.writeFileSync(configPath, "throw new Error('boom'); export default {};");
  await assert.rejects(loadConfig(tmp), /boom/);
});

void test('rejects invalid token file content', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.json' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: {
          primary: {
            $type: 'color',
          },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /DTIF/);
});

void test('rejects unresolved token aliases', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.json' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: {
          primary: { $type: 'color', $ref: '#/color/missing' },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /DTIF/);
});

void test('rejects inline tokens using legacy shorthand', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { color: { $type: 'color', blue: '#00f' } } }),
  );
  await assert.rejects(
    loadConfig(tmp),
    /Tokens must be DTIF design token objects/i,
  );
});

void test('rejects non-token file paths in config', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.json' } }),
  );
  await assert.rejects(loadConfig(tmp), /Token file paths must be relative/);
});

void test('allows token names differing only by case', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: {
          Blue: { $type: 'color', $value: srgb([0, 0, 1]) },
          blue: { $type: 'color', $value: srgb([0, 0, 1]) },
        },
      },
    }),
  );
  await assert.doesNotReject(loadConfig(tmp));
});

void test('rejects token names with invalid characters', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        $bad: { $type: 'color', $value: srgb([0, 0, 0]) },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /Schema violation|DTIF4010/i);
});

void test('rejects circular token aliases', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        color: {
          a: { $type: 'color', $ref: '#/color/b' },
          b: { $type: 'color', $ref: '#/color/a' },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /DTIF/i);
});

void test('rejects invalid typography tokens', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        typography: {
          $type: 'typography',
          bad: { $value: { fontFamily: 'Arial' } },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /DTIF|typography/i);
});
