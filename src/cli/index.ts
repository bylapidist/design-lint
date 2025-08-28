#!/usr/bin/env node
import fs from 'fs';
import { parseArgs } from 'node:util';
import { loadConfig } from '../config/loader';
import { Linter } from '../core/engine';
import { getFormatter } from '../formatters';

function help() {
  const msg = `design-lint [files...]

Options:
  --config <path>     Path to configuration file
  --format <name>     Output format (stylish, json, sarif)
  --output <file>     Write report to file
  --quiet             Suppress stdout output
  --fix               Automatically fix problems
  --help              Show this message`;
  // eslint-disable-next-line no-console
  console.log(msg);
}

export async function run(argv = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        config: { type: 'string' },
        format: { type: 'string', default: 'stylish' },
        output: { type: 'string' },
        quiet: { type: 'boolean', default: false },
        fix: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });

    if (values.help) {
      help();
      return;
    }

    const targets = positionals.length ? positionals : ['.'];
    const config = loadConfig(process.cwd(), values.config);
    const linter = new Linter(config);
    const results = await linter.lintFiles(targets, values.fix);
    const formatter = getFormatter(values.format as string);
    const output = formatter(results);

    if (values.output) {
      fs.writeFileSync(values.output as string, output, 'utf8');
    } else if (!values.quiet) {
      // eslint-disable-next-line no-console
      console.log(output);
    }

    const hasErrors = results.some((r) =>
      r.messages.some((m) => m.severity === 'error'),
    );
    if (hasErrors) process.exitCode = 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}
