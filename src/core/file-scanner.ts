import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { performance } from 'node:perf_hooks';
import { loadIgnore } from './ignore.js';
import { relFromCwd, realpathIfExists } from '../utils/paths.js';
import type { Config } from './linter.js';

export async function scanFiles(
  targets: string[],
  config: Config,
  additionalIgnorePaths: string[] = [],
): Promise<{ files: string[]; ignoreFiles: string[] }> {
  const { ig, patterns: ignorePatterns } = await loadIgnore(
    config,
    additionalIgnorePaths,
  );
  const normalizedPatterns = [...ignorePatterns];
  const scanPatterns = config.patterns ?? [
    '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,svelte,vue}',
  ];
  const seenIgnore = new Set<string>();

  for (const root of [
    '.gitignore',
    '.designlintignore',
    ...additionalIgnorePaths,
  ]) {
    const full = path.resolve(process.cwd(), root);
    try {
      await fs.access(full);
      seenIgnore.add(full);
    } catch {
      // ignore missing
    }
  }

  const readNestedIgnore = async (dir: string) => {
    const ignoreFiles = (
      await fg(['**/.gitignore', '**/.designlintignore'], {
        cwd: dir,
        absolute: true,
        dot: true,
        ignore: normalizedPatterns,
      })
    ).map(realpathIfExists);
    ignoreFiles.sort(
      (a, b) => a.split(path.sep).length - b.split(path.sep).length,
    );
    for (const file of ignoreFiles) {
      if (seenIgnore.has(file)) continue;
      seenIgnore.add(file);
      const dirOfFile = path.dirname(file);
      const relDir = relFromCwd(dirOfFile);
      if (relDir === '') continue;
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => {
            const neg = l.startsWith('!');
            const pattern = neg ? l.slice(1) : l;
            const cleaned = pattern.replace(/^[\\/]+/, '').replace(/\\/g, '/');
            const combined = relDir
              ? path.posix.join(relDir, cleaned)
              : cleaned;
            return neg ? `!${combined}` : combined;
          });
        ig.add(lines);
        normalizedPatterns.push(...lines);
      } catch {
        // ignore
      }
    }
  };

  const files: string[] = [];
  const scanStart = performance.now();
  for (const t of targets) {
    const full = realpathIfExists(path.resolve(t));
    const rel = relFromCwd(full);
    if (ig.ignores(rel)) continue;
    try {
      const stat = await fs.stat(full);
      if (stat.isDirectory()) {
        await readNestedIgnore(full);
        const entries = await fg(scanPatterns, {
          cwd: full,
          absolute: true,
          dot: true,
          ignore: normalizedPatterns,
        });
        for (const e of entries) files.push(realpathIfExists(e));
      } else {
        files.push(full);
      }
    } catch {
      // skip missing files
    }
  }
  const scanTime = performance.now() - scanStart;
  if (process.env.DESIGNLINT_PROFILE) {
    console.log(`Scanned ${files.length} files in ${scanTime.toFixed(2)}ms`);
  }

  return { files, ignoreFiles: Array.from(seenIgnore) };
}
