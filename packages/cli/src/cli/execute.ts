import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import writeFileAtomic from 'write-file-atomic';
import type { LintResult, Cache, Linter } from '@lapidist/design-lint-core';

export interface ExecuteOptions {
  fix?: boolean;
  quiet?: boolean;
  output?: string;
  format?: string;
  report?: string;
  maxWarnings?: number;
}

export interface ExecuteServices {
  formatter: (results: LintResult[], useColor?: boolean) => string;
  linterRef: { current: Linter };
  cache?: Cache;
  cacheLocation?: string;
  ignorePath?: string;
  state: { pluginPaths: string[]; ignoreFilePaths: string[] };
  useColor: boolean;
}

export async function executeLint(
  targets: string[],
  opts: ExecuteOptions,
  services: ExecuteServices,
): Promise<{ results: LintResult[]; exitCode: number; ignoreFiles: string[] }> {
  const start = performance.now();
  const {
    results,
    ignoreFiles = [],
    warning,
  } = await services.linterRef.current.lintFiles(
    targets,
    opts.fix,
    services.cache,
    services.ignorePath ? [services.ignorePath] : [],
    services.cacheLocation,
  );
  const duration = performance.now() - start;
  if (warning && !opts.quiet) console.warn(warning);
  const output = services.formatter(results, services.useColor);
  if (opts.output) {
    await writeFileAtomic(opts.output, output);
  } else if (!opts.quiet) {
    console.log(output);
  }
  const fmt = opts.format;
  if (!opts.quiet && (fmt === undefined || fmt === 'stylish')) {
    const time = (duration / 1000).toFixed(2);
    const count = results.length;
    const stat = `\nLinted ${String(count)} file${count === 1 ? '' : 's'} in ${time}s`;
    console.log(services.useColor ? chalk.cyan.bold(stat) : stat);
  }
  if (opts.report) {
    await writeFileAtomic(
      opts.report,
      JSON.stringify({ results, ignoreFiles }, null, 2),
    );
  }
  const hasErrors = results.some((r) =>
    r.messages.some((m) => m.severity === 'error'),
  );
  const warningCount = results.reduce(
    (count, r) =>
      count + r.messages.filter((m) => m.severity === 'warn').length,
    0,
  );
  const maxWarnings = opts.maxWarnings;
  let exitCode = hasErrors ? 1 : 0;
  if (maxWarnings !== undefined && warningCount > maxWarnings) exitCode = 1;
  services.state.ignoreFilePaths = ignoreFiles;
  return { results, exitCode, ignoreFiles };
}
