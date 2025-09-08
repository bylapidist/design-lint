import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp.ts';
import path from 'node:path';
import { loadConfig } from '../src/index.ts';
import { Linter } from '../src/index.ts';
import { FileSource } from '../src/index.ts';

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
    JSON.stringify({ tokens: { colors: { primary: '#000' } } }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = await loadConfig(nested);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
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
        borderRadius: { sm: 2 },
        borderWidths: { sm: 1 },
        shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
        durations: { fast: '200ms' },
      },
    }),
  );
  const loaded = await loadConfig(tmp);
  assert.ok(loaded.tokens);
  const tokens = loaded.tokens;
  assert.equal(tokens.borderRadius.sm, 2);
  assert.equal(tokens.borderWidths.sm, 1);
  assert.equal(tokens.shadows.sm, '0 1px 2px rgba(0,0,0,0.1)');
  assert.equal(tokens.durations.fast, '200ms');
});

void test('throws on invalid rule setting', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'design-token/colors': 'invalid' } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

void test('throws on invalid plugin path', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ plugins: [123] }));
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

void test('loads config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

void test('loads config from .js', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

void test('loads config from .cjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.cjs');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

void test('loads async config from .mjs', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default await Promise.resolve({ tokens: { colors: { primary: '#000' } } });",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

void test('loads config from .ts using defineConfig', async () => {
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

void test('loads config from .ts with type annotations', async () => {
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
    `import { defineConfig } from '${rel}';\nexport default defineConfig({ tokens: { colors: { primary: '#000' } } });`,
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
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
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

void test("rule configured as 'off' is ignored", async () => {
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
  const linter = new Linter(config, new FileSource());
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
  const linter = new Linter(config, new FileSource());
  await assert.rejects(
    () => linter.lintText('const x = 1;', 'file.ts'),
    /Unknown rule\(s\): unknown\/rule/,
  );
});

void test('loads config with multi-theme tokens', async () => {
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
  const hasLight = (
    tokens: unknown,
  ): tokens is { light?: { colors?: { primary?: string } } } =>
    typeof tokens === 'object' && tokens !== null && 'light' in tokens;
  const light = hasLight(loaded.tokens) ? loaded.tokens.light : undefined;
  assert.equal(light?.colors?.primary, '#fff');
});

void test('surfaces errors thrown by ts config', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.ts');
  fs.writeFileSync(configPath, "throw new Error('boom'); export default {};");
  await assert.rejects(loadConfig(tmp), /boom/);
});
