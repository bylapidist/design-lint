#!/usr/bin/env node
import fs from 'fs';
import yargs from 'yargs';
import { loadConfig } from '../config/loader';
import { Linter } from '../core/engine';
import { getFormatter } from '../formatters';

export async function run(argv = process.argv.slice(2)) {
  const args = await yargs(argv)
    .usage('design-lint [files...]')
    .option('config', { type: 'string', describe: 'Path to config file' })
    .option('format', {
      choices: ['stylish', 'json', 'sarif'],
      default: 'stylish',
    })
    .option('output', { type: 'string' })
    .option('quiet', { type: 'boolean', default: false })
    .option('fix', { type: 'boolean', default: false })
    .help()
    .parseAsync();

  const targets = args._.length ? (args._ as string[]) : ['.'];
  const config = loadConfig(process.cwd(), args.config);
  const linter = new Linter(config);
  const results = await linter.lintFiles(targets);
  const formatter = getFormatter(args.format);
  const output = formatter(results);

  if (args.output) {
    fs.writeFileSync(args.output, output, 'utf8');
  } else if (!args.quiet) {
    // eslint-disable-next-line no-console
    console.log(output);
  }

  const hasErrors = results.some((r) =>
    r.messages.some((m) => m.severity === 'error'),
  );
  if (hasErrors) process.exitCode = 1;
}

if (require.main === module) {
  run();
}
