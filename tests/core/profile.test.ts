import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/utils/tmp.ts';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';
import type { Config } from '../../src/core/linter.ts';
import type { Environment } from '../../src/core/environment.ts';

// Ensure FileSource.scan logs when profiling is enabled
// This also covers the catch branch for missing files by passing a non-existent target

// Use separate test for profiling

void test('FileSource.scan logs when DESIGNLINT_PROFILE is set', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ themes: { default: {} }, merged: {} }),
    },
  };
  const linter = new Linter({ tokens: {}, rules: {} }, env);
  const cwd = process.cwd();
  process.chdir(dir);
  process.env.DESIGNLINT_PROFILE = '1';
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (msg?: unknown) => {
    logs.push(String(msg));
  };
  try {
    // Include a missing file to hit the catch branch
    await linter.lintFiles(['file.ts', 'missing.ts']);
  } finally {
    console.log = origLog;
    delete process.env.DESIGNLINT_PROFILE;
    process.chdir(cwd);
  }
  assert.ok(logs.some((l) => l.includes('Scanned 1 files in')));
});

void test('FileSource.scan collects files from directory targets', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'a.ts'), '');
  const config: Config = { tokens: {}, rules: {} };
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const env: Environment = {
      documentSource: new FileSource(),
      tokenProvider: {
        load: () =>
          Promise.resolve({
            themes: { default: config.tokens ?? {} },
            merged: config.tokens ?? {},
          }),
      },
    };
    const docs = await env.documentSource.scan(['.'], config);
    const rels = docs.map((d) => path.relative(dir, d.id));
    assert.deepEqual(rels, ['a.ts']);
  } finally {
    process.chdir(cwd);
  }
});
