import path from 'node:path';
import fs from 'node:fs';
import { globby } from 'globby';
import picomatch from 'picomatch';
import { performance } from 'node:perf_hooks';
import { realpathIfExists, toPosix } from './utils/paths.js';
import { loadIgnore } from '../../core/ignore.js';
import type { Config } from '../../core/linter.js';
import type { DocumentSource } from '../../core/environment.js';
import { createFileDocument } from './file-document.js';
import { defaultPatterns } from '../../core/file-types.js';

const hasGlob = (pattern: string) => picomatch.scan(pattern).isGlob;

const expandDirectoryTargets = (
  targets: string[],
  patterns: string[],
  cwd: string,
) => {
  if (!targets.length) return targets;
  const expanded = new Set<string>(targets);
  for (const target of targets) {
    if (hasGlob(target)) continue;
    const resolved = path.resolve(cwd, target);
    let stats: fs.Stats | undefined;
    try {
      stats = fs.statSync(resolved);
    } catch {
      continue;
    }
    if (!stats?.isDirectory()) continue;
    const base = target === '.' ? '' : toPosix(target);
    for (const pattern of patterns) {
      expanded.add(base ? path.posix.join(base, pattern) : pattern);
    }
  }
  return Array.from(expanded);
};

export class FileSource implements DocumentSource {
  async scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths: string[] = [],
  ) {
    const patterns = config.patterns ?? defaultPatterns;
    const cwd = process.cwd();
    const expandedTargets = expandDirectoryTargets(targets, patterns, cwd);
    const ignoreFiles = [
      ...(
        await globby(['**/.gitignore', '**/.designlintignore'], {
          gitignore: false,
          dot: true,
          absolute: true,
        })
      ).map(realpathIfExists),
      ...additionalIgnorePaths.map(realpathIfExists),
    ];
    const deduped = Array.from(new Set(ignoreFiles));
    const rootGitIgnore = realpathIfExists(path.join(cwd, '.gitignore'));
    const rootDesignIgnore = realpathIfExists(
      path.join(cwd, '.designlintignore'),
    );
    const extraIgnoreFiles = deduped.filter(
      (file) => file !== rootGitIgnore && file !== rootDesignIgnore,
    );
    const { ig } = await loadIgnore(config, extraIgnoreFiles);
    const start = performance.now();
    const files = (
      await globby(expandedTargets, {
        expandDirectories: patterns,
        gitignore: false,
        ignore: [],
        dot: true,
        absolute: true,
      })
    )
      .map(realpathIfExists)
      .filter((file) => {
        const rel = path.relative(cwd, file).replace(/\\/g, '/');
        if (rel.startsWith('../') || rel === '..') {
          return true;
        }
        const normalized = rel || file.replace(/\\/g, '/');
        return !ig.ignores(normalized);
      });
    const duration = performance.now() - start;
    if (process.env.DESIGNLINT_PROFILE) {
      console.log(
        `Scanned ${String(files.length)} files in ${duration.toFixed(2)}ms`,
      );
    }
    return { documents: files.map(createFileDocument), ignoreFiles: deduped };
  }
}
