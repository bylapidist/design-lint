#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { Linter } from '../../dist/core/linter.js';
import { loadConfig } from '../../dist/config/loader.js';

const targets = process.argv.slice(2);

(async () => {
  const config = await loadConfig(process.cwd());
  const linter = new Linter(config);
  const start = performance.now();
  await linter.lintFiles(targets.length ? targets : ['.']);
  const end = performance.now();
  // eslint-disable-next-line no-console
  console.log(`Linted in ${(end - start).toFixed(2)}ms`);
})();
