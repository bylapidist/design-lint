import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp.ts';
import path from 'node:path';
import { loadConfig } from '../src/config/loader.ts';
import { Linter } from '../src/core/linter.ts';

test('returns default config when none found', async () => {
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

test('finds config in parent directories', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { colors: { primary: '#000' } } }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = await loadConfig(nested);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('throws on malformed JSON config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, '{ invalid json');
  await assert.rejects(loadConfig(tmp), /Failed to load config/);
});

test('throws on malformed JS config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(configPath, 'module.exports = { tokens: {},');
  await assert.rejects(loadConfig(tmp), /Failed to load config/);
});

test('throws when specified config file is missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    loadConfig(tmp, 'designlint.config.json'),
    /Config file not found.*npx design-lint init/,
  );
});

test('throws on invalid tokens', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { colors: { primary: 123 } } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('validates additional token groups', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        borderRadius: { sm: 2 },
        borderWidths: { sm: 1 },
        shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
        durations: { fast: '200ms' },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.borderRadius?.sm, 2);
  assert.equal(loaded.tokens?.borderWidths?.sm, 1);
  assert.equal(loaded.tokens?.shadows?.sm, '0 1px 2px rgba(0,0,0,0.1)');
  assert.equal(loaded.tokens?.durations?.fast, '200ms');
});

test('throws on invalid additional tokens', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { borderWidths: { sm: true } } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('throws on invalid rule setting', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'design-token/colors': 'invalid' } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('throws on invalid plugin path', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ plugins: [123] }));
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('loads config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config from .js', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config from .cjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.cjs');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads async config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default await Promise.resolve({ tokens: { colors: { primary: '#000' } } });",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config from .ts using defineConfig', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `const { defineConfig } = require('${rel}');\nmodule.exports = defineConfig({ tokens: { colors: { primary: '#000' } } });`,
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config from .ts with type annotations', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const rel = path
    .relative(tmp, path.resolve('src/index.ts'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '${rel}';\nconst colours: string[] = [];\nexport default defineConfig({ tokens: { colors: { primary: '#000' } } });`,
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads .ts config with commonjs module output', async () => {
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
    `import { defineConfig } from '${rel}';\nexport default defineConfig({ tokens: { colors: { primary: '#000' } } });`,
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads .ts config importing built package entry', () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  const relPkg = path
    .relative(tmp, path.resolve('dist/index.js'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    configPath,
    `import { defineConfig } from '${relPkg}';\nexport default defineConfig({ tokens: { colors: { primary: '#000' } } });`,
  );
  const runnerPath = path.join(tmp, 'runner.mjs');
  const relLoader = path
    .relative(tmp, path.resolve('dist/config/loader.js'))
    .replace(/\\/g, '/');
  fs.writeFileSync(
    runnerPath,
    `import { loadConfig } from '${relLoader}';\nconst cfg = await loadConfig('${tmp.replace(/\\/g, '/')}');\nconsole.log(cfg.tokens.colors.primary);\n`,
  );
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [runnerPath], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '#000');
});

test('restores original .mts handler after loading config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mts');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const otherPath = path.join(tmp, 'other.mts');
  fs.writeFileSync(otherPath, '');
  let called = false;
  const original = require.extensions['.mts'];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    require.extensions['.mts'] = (mod: NodeModule, _filename: string) => {
      called = true;
      mod.exports = { handled: true };
    };
    await loadConfig(tmp);
    assert.equal(called, false);
    const result = require(otherPath);
    assert.deepEqual(result, { handled: true });
    assert.equal(called, true);
  } finally {
    if (original) {
      require.extensions['.mts'] = original;
    } else {
      delete require.extensions['.mts'];
    }
  }
});

test('loads config when package.json type module', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test("rule configured as 'off' is ignored", async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { colors: { primary: '#000' } },
      rules: { 'design-token/colors': 'off' },
    }),
  );
  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  const res = await linter.lintText('const c = "#fff";', 'file.ts');
  assert.equal(res.messages.length, 0);
});

test('throws on unknown rule name', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'unknown/rule': 'error' } }),
  );
  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  await assert.rejects(
    () => linter.lintText('const x = 1;', 'file.ts'),
    /Unknown rule\(s\): unknown\/rule/,
  );
});

test('loads config with multi-theme tokens', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        light: { colors: { primary: '#fff' } },
        dark: { colors: { primary: '#000' } },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#fff');
});
