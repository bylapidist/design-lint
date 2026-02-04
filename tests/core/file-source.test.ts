import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import type { Config } from '../../src/core/linter.js';

void test('FileSource.scan expands directory targets with brace patterns', async () => {
  const dir = makeTmpDir();
  const config: Config = {
    tokens: {},
    rules: {},
    patterns: ['**/*.{ts,tsx,js,jsx}'],
  };
  fs.mkdirSync(path.join(dir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'app', 'page.tsx'), '');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { documents } = await new FileSource().scan(['src/app'], config);
    const rels = documents.map((doc) => path.relative(dir, doc.id));
    assert.deepEqual(rels, [path.join('src', 'app', 'page.tsx')]);
  } finally {
    process.chdir(cwd);
  }
});

void test('FileSource.scan preserves negated patterns for directory targets', async () => {
  const dir = makeTmpDir();
  const config: Config = {
    tokens: {},
    rules: {},
    patterns: ['**/*.{ts,tsx}', '!**/*.spec.tsx'],
  };
  fs.mkdirSync(path.join(dir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'app', 'page.tsx'), '');
  fs.writeFileSync(path.join(dir, 'src', 'app', 'page.spec.tsx'), '');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { documents } = await new FileSource().scan(['src/app'], config);
    const rels = documents.map((doc) => path.relative(dir, doc.id));
    assert.deepEqual(rels, [path.join('src', 'app', 'page.tsx')]);
  } finally {
    process.chdir(cwd);
  }
});

void test('FileSource.scan expands negated directory targets', async () => {
  const dir = makeTmpDir();
  const config: Config = {
    tokens: {},
    rules: {},
    patterns: ['**/*.{ts,tsx}'],
  };
  fs.mkdirSync(path.join(dir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'app', 'page.tsx'), '');
  fs.writeFileSync(path.join(dir, 'src', 'entry.tsx'), '');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { documents } = await new FileSource().scan(
      ['src', '!src/app'],
      config,
    );
    const rels = documents.map((doc) => path.relative(dir, doc.id));
    assert.deepEqual(rels, [path.join('src', 'entry.tsx')]);
  } finally {
    process.chdir(cwd);
  }
});
