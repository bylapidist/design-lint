import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectInitFormat,
  renderConfigTemplate,
} from '../../src/init-config.ts';
import { makeTmpDir } from '../../../core/src/utils/tmp.ts';

void test('detectInitFormat infers ts when tsconfig exists', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    assert.equal(detectInitFormat(), 'ts');
  } finally {
    process.chdir(cwd);
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
  }
});

void test('detectInitFormat throws for unsupported format', () => {
  assert.throws(() => detectInitFormat('yaml'), /Unsupported init format/);
});

void test('renderConfigTemplate emits defineConfig for ts', () => {
  const tpl = renderConfigTemplate('ts');
  assert.ok(tpl.includes('defineConfig'));
});
