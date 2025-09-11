import { globby } from 'globby';
import { performance } from 'node:perf_hooks';
import { realpathIfExists } from './utils/paths';
import { getIgnorePatterns } from '../../core/ignore';
import type { Config } from '../../core/linter';
import type { DocumentSource } from '../../core/environment';
import { createFileDocument } from './file-document';
import { defaultPatterns } from '../../core/file-types';

export class FileSource implements DocumentSource {
  async scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths: string[] = [],
  ) {
    const patterns = config.patterns ?? defaultPatterns;
    const ignore = getIgnorePatterns(config);
    const start = performance.now();
    const files = (
      await globby(targets, {
        expandDirectories: patterns,
        gitignore: true,
        ignore,
        ignoreFiles: ['**/.designlintignore', ...additionalIgnorePaths],
        dot: true,
        absolute: true,
      })
    ).map(realpathIfExists);
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
    const duration = performance.now() - start;
    if (process.env.DESIGNLINT_PROFILE) {
      console.log(
        `Scanned ${String(files.length)} files in ${duration.toFixed(2)}ms`,
      );
    }
    return { documents: files.map(createFileDocument), ignoreFiles: deduped };
  }
}
