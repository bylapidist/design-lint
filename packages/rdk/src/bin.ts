#!/usr/bin/env node
/**
 * design-lint-rdk CLI
 *
 * Usage:
 *   design-lint-rdk dev <rule-path> [--fixtures <fixtures-dir>] [--port <port>]
 */
import { watchRule } from './watcher.js';
import type { RdkRunResult } from './types.js';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function formatResult(result: RdkRunResult): void {
  const now = new Date().toLocaleTimeString();
  console.log(`\n${DIM}[${now}]${RESET} ${BOLD}design-lint-rdk${RESET}`);

  const total = result.total.toString();
  const failing = result.failing.toString();
  const passing = result.passing.toString();
  const duration = result.durationMs.toString();

  if (result.passed) {
    console.log(
      `${GREEN}✓ All ${total} tests passed${RESET} ${DIM}(${duration}ms)${RESET}`,
    );
  } else {
    console.log(
      `${RED}✗ ${failing} of ${total} tests failed${RESET} ${DIM}(${duration}ms)${RESET}`,
    );
    for (const err of result.errors) {
      console.log(`  ${RED}●${RESET} ${err}`);
    }
  }

  if (result.passing > 0 && result.failing > 0) {
    console.log(`${YELLOW}  ${passing} passing, ${failing} failing${RESET}`);
  }
}

function parseArgs(argv: string[]): {
  rulePath: string | undefined;
  fixturesDir: string | undefined;
  port: number | undefined;
  command: string | undefined;
} {
  const args = argv.slice(2);
  const command = args[0];
  const rulePath = args[1];

  let fixturesDir: string | undefined;
  let port: number | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--fixtures' && args[i + 1]) {
      fixturesDir = args[i + 1];
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (Number.isFinite(n)) port = n;
      i++;
    }
  }

  return { command, rulePath, fixturesDir, port };
}

function printUsage(): void {
  console.log(`
${BOLD}design-lint-rdk${RESET} — Rule Development Kit for @lapidist/design-lint

${BOLD}Usage:${RESET}
  design-lint-rdk dev <rule-path> [options]

${BOLD}Commands:${RESET}
  dev   Watch a rule file and re-run tests on every change

${BOLD}Options:${RESET}
  --fixtures <dir>   Directory containing <rulename>.fixture.ts files
  --port <number>    Port for optional web UI (not yet implemented)

${BOLD}Examples:${RESET}
  design-lint-rdk dev src/rules/my-rule.ts
  design-lint-rdk dev src/rules/my-rule.ts --fixtures fixtures/
`);
}

const { command, rulePath, fixturesDir } = parseArgs(process.argv);

if (command !== 'dev' || !rulePath) {
  printUsage();
  process.exit(command ? 1 : 0);
}

console.log(`${BOLD}design-lint-rdk${RESET} watching ${rulePath}…\n`);

const stop = watchRule({ rulePath, fixturesDir }, formatResult);

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
