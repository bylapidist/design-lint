import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';

void test('lintTargets ignores common directories by default', async () => {
  const dir = makeTmpDir();
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
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId));
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('lintTargets respects .gitignore via globby', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'src/skip.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('.designlintignore can unignore paths', async () => {
  const dir = makeTmpDir();
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
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['node_modules/pkg/index.ts', 'src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('.designlintignore overrides .gitignore', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'src/file.ts');
  fs.writeFileSync(path.join(dir, '.designlintignore'), '!src/file.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('.designlintignore supports negative patterns', async () => {
  const dir = makeTmpDir();
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
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('.designlintignore supports Windows paths', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'ignore.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.designlintignore'), 'src\\ignore.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('config ignoreFiles are respected', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
        ignoreFiles: ['src/skip.ts'],
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('additional ignore file is respected', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  const extra = path.join(dir, '.customignore');
  fs.writeFileSync(extra, 'src/skip.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.'], false, [extra]);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('lintTargets respects nested .gitignore', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'nested', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'nested', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'nested', '.gitignore'), 'skip.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['nested/keep.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('nested .designlintignore overrides parent patterns', async () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.designlintignore'), 'src/skip.ts');
  fs.writeFileSync(path.join(dir, 'src', '.designlintignore'), '!skip.ts');

  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const linter = new Linter(
      {
        tokens: { deprecations: { old: { replacement: 'new' } } },
        rules: { 'design-system/deprecation': 'error' },
      },
      new FileSource(),
    );
    const { results } = await linter.lintTargets(['.']);
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/keep.ts', 'src/skip.ts']);
  } finally {
    process.chdir(cwd);
  }
});
