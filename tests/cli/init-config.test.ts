import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectInitFormat,
  renderConfigTemplate,
  initConfig,
} from '../../src/cli/init-config.js';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';

void test('detectInitFormat infers ts when tsconfig exists', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    assert.equal(detectInitFormat(), 'ts');
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('detectInitFormat defaults to json without indicators', () => {
  const dir = makeTmpDir();
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    assert.equal(detectInitFormat(), 'json');
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('detectInitFormat throws for unsupported format', () => {
  assert.throws(() => detectInitFormat('yaml'), /Unsupported init format/);
});

void test('detectInitFormat infers ts from package dependencies', () => {
  const dir = makeTmpDir();
  const pkgPath = path.join(dir, 'package.json');
  fs.writeFileSync(
    pkgPath,
    JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }),
  );
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    assert.equal(detectInitFormat(), 'ts');
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('renderConfigTemplate emits defineConfig for ts', () => {
  const tpl = renderConfigTemplate('ts');
  assert.ok(tpl.includes('defineConfig'));
});

void test('renderConfigTemplate supports commonjs formats', () => {
  const js = renderConfigTemplate('js');
  const cjs = renderConfigTemplate('cjs');
  assert.ok(js.includes('module.exports'));
  assert.equal(js, cjs);
});

void test('renderConfigTemplate supports esm formats', () => {
  const mjs = renderConfigTemplate('mjs');
  const mts = renderConfigTemplate('mts');
  assert.ok(mjs.startsWith('export default'));
  assert.ok(mts.includes('defineConfig'));
});

void test('initConfig writes config file and reports success', () => {
  const dir = makeTmpDir();
  const cwd = process.cwd();
  process.chdir(dir);
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: Parameters<typeof console.log>) => {
    logs.push(args.join(' '));
  };
  try {
    initConfig('json');
    const configPath = path.join(dir, 'designlint.config.json');
    assert.equal(fs.existsSync(configPath), true);
    const contents = fs.readFileSync(configPath, 'utf8');
    assert.ok(contents.includes('"tokens": {}'));
    assert.deepEqual(logs, ['Created designlint.config.json']);
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('initConfig does not overwrite existing config', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(configPath, '{"existing":true}', 'utf8');
  const cwd = process.cwd();
  process.chdir(dir);
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: Parameters<typeof console.log>) => {
    logs.push(args.join(' '));
  };
  try {
    initConfig('json');
    assert.deepEqual(logs, ['designlint.config.json already exists']);
    assert.equal(fs.readFileSync(configPath, 'utf8'), '{"existing":true}');
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('initConfig reports errors from invalid formats', () => {
  const dir = makeTmpDir();
  const cwd = process.cwd();
  process.chdir(dir);
  const originalError = console.error;
  const errors: string[] = [];
  const originalExitCode = process.exitCode;
  console.error = (...args: Parameters<typeof console.error>) => {
    errors.push(args.join(' '));
  };
  try {
    initConfig('yaml');
    assert.equal(process.exitCode, 1);
    assert.ok(errors[0]?.includes('Unsupported init format'));
    assert.equal(
      fs.existsSync(path.join(dir, 'designlint.config.yaml')),
      false,
    );
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
