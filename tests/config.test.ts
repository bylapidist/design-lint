import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.ts';
import path from 'node:path';
import { loadConfig } from '../src/config/loader.ts';
import { resolveConfigFile } from '../src/config/file-resolution.ts';
import { loadTokens } from '../src/config/token-loader.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';
import { ConfigError } from '../src/core/errors.ts';

void test('resolveConfigFile returns null when config missing', async () => {
  const tmp = makeTmpDir();
  const result = await resolveConfigFile(tmp);
  assert.equal(result, null);
});

void test('resolveConfigFile finds config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ tokens: {} }));
  const nested = path.join(tmp, 'nested');
  fs.mkdirSync(nested, { recursive: true });
  const result = await resolveConfigFile(nested);
  assert.ok(result?.filepath.endsWith('designlint.config.json'));
});

void test('loadTokens reads token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color', $value: '#000' } } }),
  );
  const tokens = await loadTokens({ light: './light.tokens.json' }, tmp);
  const light = tokens.light as { color: { primary: { $value: string } } };
  assert.equal(light.color.primary.$value, '#000');
});

void test('loadTokens propagates errors', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'bad.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color' } } }),
  );
  await assert.rejects(
    loadTokens({ light: './bad.tokens.json' }, tmp),
    /missing \$value/i,
  );
});
void test('returns default config when none found', async () => {
  const tmp = makeTmpDir();
  const config = await loadConfig(tmp);
  assert.deepEqual(config, {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: undefined,
  });
});

void test('finds config in parent directories', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { color: { $type: 'color', primary: { $value: '#000' } } },
    }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = await loadConfig(nested);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
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
  await assert.rejects(loadConfig(tmp), /Transform failed/);
});

void test('rejects bare string token values', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ tokens: { color: '#000' } }));
  await assert.rejects(
    loadConfig(tmp),
    /Tokens must be W3C Design Tokens objects/,
  );
});

void test('propagates token parsing errors', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { color: { primary: { $type: 'color' } } } }),
  );
  await assert.rejects(loadConfig(tmp), /missing \$value/i);
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
        borderRadius: {
          $type: 'dimension',
          sm: { $value: { value: 2, unit: 'px' } },
        },
        borderWidths: {
          $type: 'dimension',
          sm: { $value: { value: 1, unit: 'px' } },
        },
        shadows: {
          $type: 'shadow',
          sm: {
            $value: {
              color: '#000',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 1, unit: 'px' },
              blur: { value: 2, unit: 'px' },
            },
          },
        },
        durations: {
          $type: 'duration',
          fast: { $value: { value: 200, unit: 'ms' } },
        },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.ok(loaded.tokens);
  const tokens = loaded.tokens as {
    borderRadius: { sm: { $value: { value: number } } };
    borderWidths: { sm: { $value: { value: number } } };
    shadows: { sm: { $value: { color: string } } };
    durations: { fast: { $value: { unit: string } } };
  };
  assert.equal(tokens.borderRadius.sm.$value.value, 2);
  assert.equal(tokens.borderWidths.sm.$value.value, 1);
  assert.equal(tokens.shadows.sm.$value.color, '#000');
  assert.equal(tokens.durations.fast.$value.unit, 'ms');
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

void test('throws on invalid plugin path', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ plugins: [123] }));
  await assert.rejects(loadConfig(tmp), (err) => {
    assert.ok(err instanceof ConfigError);
    assert.ok(err.context.includes('designlint.config.json'));
    assert.equal(err.remediation, 'Review and fix the configuration file.');
    return err.message.includes('Invalid config');
  });
});

void test('loads config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { color: { $type: 'color', primary: { $value: '#000' } } } };",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test('loads config from .js', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { color: { $type: 'color', primary: { $value: '#000' } } } };",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test('loads config from .cjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.cjs');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { color: { $type: 'color', primary: { $value: '#000' } } } };",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test('loads async config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default await Promise.resolve({ tokens: { color: { $type: 'color', primary: { $value: '#000' } } } });",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test('loads config from .ts using defineConfig', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `const { defineConfig } = require('${rel}');\nmodule.exports = defineConfig({ tokens: { color: { $type: 'color', primary: { $value: '#000' } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test('loads config from .ts with type annotations', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '${rel}';\nconst colours: string[] = [];\nexport default defineConfig({ tokens: { color: { $type: 'color', primary: { $value: '#000' } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
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
    `import { defineConfig } from '${rel}';\nexport default defineConfig({ tokens: { color: { $type: 'color', primary: { $value: '#000' } } } });`,
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
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
    "export default { tokens: { color: { $type: 'color', primary: { $value: '#000' } } } };",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as { color: { primary: { $value: string } } };
  assert.equal(tokens.color.primary.$value, '#000');
});

void test("rule configured as 'off' is ignored", async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { color: { $type: 'color', primary: { $value: '#000' } } },
      rules: { 'design-token/colors': 'off' },
    }),
  );
  const config = await loadConfig(tmp);
  const linter = new Linter(config, { documentSource: new FileSource() });
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
  const linter = new Linter(config, { documentSource: new FileSource() });
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
        light: { color: { $type: 'color', primary: { $value: '#fff' } } },
        dark: { color: { $type: 'color', primary: { $value: '#000' } } },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    light: { color: { primary: { $value: string } } };
    dark: { color: { primary: { $value: string } } };
  };
  assert.equal(tokens.light.color.primary.$value, '#fff');
});

void test('loads config with spec token tree', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        color: { brand: { primary: { $type: 'color', $value: '#000' } } },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as {
    color: { brand: { primary: { $value: string } } };
  };
  assert.equal(tokens.color.brand.primary.$value, '#000');
});

void test('loads tokens from theme file paths', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.json' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({ color: { brand: { primary: { $value: '#000' } } } }),
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: { brand: { primary: { $value: string } } };
  };
  assert.equal(light.color.brand.primary.$value, '#000');
});

void test('loads tokens from YAML theme file paths', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.tokens.yaml' } }),
  );
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.yaml'),
    "color:\n  $type: color\n  brand:\n    primary:\n      $value: '#000'\n",
  );
  const loaded = await loadConfig(tmp);
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: { brand: { primary: { $value: string } } };
  };
  assert.equal(light.color.brand.primary.$value, '#000');
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
    JSON.stringify({ color: { brand: { primary: { $value: '#111' } } } }),
  );
  const loaded = await loadConfig(
    tmp,
    path.join('cfg', 'designlint.config.json'),
  );
  const tokens = loaded.tokens as Record<string, unknown>;
  const light = tokens.light as {
    color: { brand: { primary: { $value: string } } };
  };
  assert.equal(light.color.brand.primary.$value, '#111');
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
    JSON.stringify({ color: { brand: { primary: { $value: '#000' } } } }),
  );
  await assert.rejects(loadConfig(tmp), /missing \$type/);
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
      color: {
        brand: {
          primary: { $type: 'color', $value: '{color.missing}' },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /references unknown token/);
});

void test('rejects inline tokens using legacy shorthand', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { color: { $type: 'color', blue: '#00f' } } }),
  );
  await assert.rejects(loadConfig(tmp), /must be an object with \$value/);
});

void test('rejects non-token file paths in config', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ tokens: { light: './light.json' } }),
  );
  await assert.rejects(
    loadConfig(tmp),
    /Token file paths must be relative and end with \.tokens or \.tokens\.json/,
  );
});

void test('rejects duplicate token names differing only by case', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        color: {
          $type: 'color',
          Blue: { $value: '#00f' },
          blue: { $value: '#00f' },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /duplicate token name/i);
});

void test('rejects token names with invalid characters', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        'bad.name': { $type: 'color', $value: '#000' },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /invalid token or group name/i);
});

void test('rejects circular token aliases', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        color: {
          a: { $type: 'color', $value: '{color.b}' },
          b: { $type: 'color', $value: '{color.a}' },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /circular alias/i);
});

void test('rejects invalid typography tokens', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        typography: {
          $type: 'typography',
          bad: { $value: { fontFamily: 'Arial' } },
        },
      },
    }),
  );
  await assert.rejects(loadConfig(tmp), /invalid typography value/i);
});
