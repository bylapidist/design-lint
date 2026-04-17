import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import chalk from 'chalk';
import writeFileAtomic from 'write-file-atomic';
import type { LintResult } from '../core/types.js';
import type { Linter } from '../core/linter.js';
import type { DesignLintPolicy } from '../core/types.js';
import {
  enforceRuntimePolicy,
  type RuntimePolicyContext,
} from '../config/policy-enforcer.js';

interface BaselineRecord {
  totalCount: number;
  score: number;
}

function isBaselineRecord(val: unknown): val is BaselineRecord {
  if (typeof val !== 'object' || val === null) return false;
  return (
    typeof Reflect.get(val, 'totalCount') === 'number' &&
    typeof Reflect.get(val, 'score') === 'number'
  );
}

export interface ExecuteOptions {
  fix?: boolean;
  quiet?: boolean;
  output?: string;
  format?: string;
  report?: string;
  maxWarnings?: number;
  failOnEmpty?: boolean;
  /** Path to a baseline JSON file for ratchet enforcement. */
  baseline?: string;
  /** Agent identifier passed to agentPolicy.trustedAgents. */
  agentId?: string;
}

export interface ExecuteServices {
  formatter: (results: LintResult[], useColor?: boolean) => string;
  linterRef: { current: Linter };
  ignorePath?: string;
  state: { pluginPaths: string[]; ignoreFilePaths: string[] };
  useColor: boolean;
  /** Active policy, when present. Used for runtime enforcement post-lint. */
  policy?: DesignLintPolicy;
  envOptions?: {
    cacheLocation?: string;
    configPath?: string;
    patterns?: string[];
  };
}

export async function executeLint(
  targets: string[],
  opts: ExecuteOptions,
  services: ExecuteServices,
): Promise<{ results: LintResult[]; exitCode: number; ignoreFiles: string[] }> {
  const start = performance.now();
  const { results, ignoreFiles, warning } =
    await services.linterRef.current.lintTargets(
      targets,
      opts.fix,
      services.ignorePath ? [services.ignorePath] : [],
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
  // Runtime policy enforcement (tokenCoverage, ratchet, agentPolicy)
  if (services.policy !== undefined) {
    const runtimeContext: RuntimePolicyContext = {
      agentId: opts.agentId,
    };
    if (opts.baseline !== undefined) {
      try {
        const raw: unknown = JSON.parse(fs.readFileSync(opts.baseline, 'utf8'));
        if (isBaselineRecord(raw)) {
          runtimeContext.baseline = {
            totalCount: raw.totalCount,
            score: raw.score,
          };
        }
      } catch {
        // Baseline file not found or invalid — skip ratchet
      }
    }
    enforceRuntimePolicy(results, services.policy, runtimeContext);
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
  if (
    opts.failOnEmpty &&
    warning === 'No files matched the provided patterns.'
  ) {
    exitCode = 1;
  }
  if (maxWarnings !== undefined && warningCount > maxWarnings) exitCode = 1;
  services.state.ignoreFilePaths = ignoreFiles;
  return { results, exitCode, ignoreFiles };
}
