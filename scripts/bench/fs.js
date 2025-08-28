#!/usr/bin/env node
const { performance } = require('node:perf_hooks');
const { Linter } = require('../../dist/core/engine.js');
const { loadConfig } = require('../../dist/config/loader.js');

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
