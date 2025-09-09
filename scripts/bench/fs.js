#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { Linter } from '../../dist/core/linter.js';
import { loadConfig } from '../../dist/config/loader.js';
import { createNodeEnvironment } from '../../dist/adapters/node/environment.js';

const targets = process.argv.slice(2);

(async () => {
  const config = await loadConfig(process.cwd());
  const env = createNodeEnvironment(config);
  const linter = new Linter(config, env);
  const start = performance.now();
  await linter.lintTargets(targets.length ? targets : ['.']);
  const end = performance.now();
  // eslint-disable-next-line no-console
  console.log(`Linted in ${(end - start).toFixed(2)}ms`);
})();
