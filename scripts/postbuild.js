#!/usr/bin/env node
import { chmodSync, existsSync, cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });

function copyPackage(pkg, target, options = {}) {
  const { withPkgJson = false, nestedDist = false } = options;
  const dest = nestedDist ? join(target, 'dist') : target;
  mkdirSync(dest, { recursive: true });
  cpSync(join(root, 'packages', pkg, 'dist'), dest, { recursive: true });
  if (withPkgJson) {
    mkdirSync(target, { recursive: true });
    const pkgJsonPath = join(root, 'packages', pkg, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (pkg === 'core') {
      delete pkgJson.main;
      delete pkgJson.module;
      pkgJson.exports = './dist/index.js';
    }
    writeFileSync(join(target, 'package.json'), JSON.stringify(pkgJson, null, 2));
  }
}

// core provides the library API
copyPackage('core', dist);
// CLI sources
copyPackage('cli', join(dist, 'cli'));
// bundle internal packages for runtime resolution
copyPackage('core', join(dist, 'node_modules', '@lapidist', 'design-lint-core'), {
  withPkgJson: true,
  nestedDist: true,
});
copyPackage('shared', join(dist, 'node_modules', '@lapidist', 'design-lint-shared'), {
  withPkgJson: true,
  nestedDist: true,
});

const cli = join(dist, 'cli', 'index.js');
if (existsSync(cli)) chmodSync(cli, 0o755);
// include root package.json for runtime version checks
cpSync(join(root, 'package.json'), join(dist, 'package.json'));
