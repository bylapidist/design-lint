import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import picomatch from 'picomatch';
import { realpathIfExists } from './utils/paths.js';
import { loadIgnore } from '../../core/ignore.js';
import type { Config } from '../../core/linter.js';
import type { DocumentSource } from '../../core/environment.js';
import { createFileDocument } from './file-document.js';
import { defaultPatterns } from '../../core/file-types.js';

export class FileSource implements DocumentSource {
  private static normalizeForGlob(value: string) {
    return value.replace(/\\/g, '/');
  }

  private static isDynamicPattern(value: string) {
    return picomatch.scan(value).isGlob;
  }

  private static expandDirectoryPatterns(
    base: string,
    patterns: string[],
  ): string[] {
    const normalizedBase = FileSource.normalizeForGlob(base);
    return patterns.map((pattern) => {
      if (pattern.startsWith('!')) {
        return `!${path.posix.join(
          normalizedBase,
          FileSource.normalizeForGlob(pattern.slice(1)),
        )}`;
      }
      return path.posix.join(
        normalizedBase,
        FileSource.normalizeForGlob(pattern),
      );
    });
  }

  private static async expandTargets(
    targets: string[],
    patterns: string[],
    cwd: string,
  ): Promise<string[]> {
    const expanded: string[] = [];
    for (const target of targets) {
      const isNegated = target.startsWith('!');
      const rawTarget = isNegated ? target.slice(1) : target;
      if (FileSource.isDynamicPattern(rawTarget)) {
        expanded.push(target);
        continue;
      }
      const resolved = path.resolve(cwd, rawTarget);
      try {
        const stats = await fs.stat(resolved);
        if (stats.isDirectory()) {
          const expandedPatterns = FileSource.expandDirectoryPatterns(
            rawTarget,
            patterns,
          );
          if (isNegated) {
            expanded.push(
              ...expandedPatterns.map((pattern) =>
                pattern.startsWith('!') ? pattern : `!${pattern}`,
              ),
            );
          } else {
            expanded.push(...expandedPatterns);
          }
          continue;
        }
      } catch {}
      expanded.push(target);
    }
    return expanded;
  }

  async scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths: string[] = [],
  ) {
    const patterns = config.patterns ?? defaultPatterns;
    const cwd = process.cwd();
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
    const expandedTargets = await FileSource.expandTargets(
      targets,
      patterns,
      cwd,
    );
    const files = (
      await globby(expandedTargets, {
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
