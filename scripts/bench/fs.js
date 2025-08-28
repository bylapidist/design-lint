#!/usr/bin/env node
const { performance } = require('node:perf_hooks');
const { Linter } = require('../../dist/core/engine.js');
const { loadConfig } = require('../../dist/config/loader.js');

const targets = process.argv.slice(2);
const config = loadConfig(process.cwd());
const linter = new Linter(config);

(async () => {
  const start = performance.now();
  await linter.lintFiles(targets.length ? targets : ['.']);
  const end = performance.now();
  // eslint-disable-next-line no-console
  console.log(`Linted in ${(end - start).toFixed(2)}ms`);
})();
