import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Linter } from '../src/core/engine';

test('lintFiles ignores common directories by default', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', 'pkg', 'index.ts'),
    'const a = "old";',
  );
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', 'file.ts'), 'const a = "old";');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    });
    const results = await linter.lintFiles(['.']);
    const files = results.map((r) => path.relative(dir, r.filePath));
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

test('.designlintignore can unignore paths', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', 'pkg', 'index.ts'),
    'const a = "old";',
  );
  fs.writeFileSync(path.join(dir, '.designlintignore'), '!node_modules/**');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    });
    const results = await linter.lintFiles(['.']);
    const files = results.map((r) => path.relative(dir, r.filePath)).sort();
    assert.deepEqual(files, ['node_modules/pkg/index.ts', 'src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

test('.designlintignore supports negative patterns', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, '.designlintignore'),
    '**/*.ts\n!src/file.ts',
  );

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    });
    const results = await linter.lintFiles(['.']);
    const files = results.map((r) => path.relative(dir, r.filePath)).sort();
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

test('.designlintignore supports Windows paths', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'ignore.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, '.designlintignore'),
    'src\\ignore.ts',
  );

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    });
    const results = await linter.lintFiles(['.']);
    const files = results.map((r) => path.relative(dir, r.filePath)).sort();
    assert.deepEqual(files, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});
