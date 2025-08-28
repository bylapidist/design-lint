#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const distDir = path.join(__dirname, '..', 'dist');
const cjsCli = path.join(distDir, 'cli', 'index.js');
if (fs.existsSync(cjsCli)) fs.chmodSync(cjsCli, 0o755);

const esmCli = path.join(distDir, 'esm', 'cli', 'index.js');
if (fs.existsSync(esmCli)) fs.chmodSync(esmCli, 0o755);

const esmPkg = path.join(distDir, 'esm', 'package.json');
fs.writeFileSync(esmPkg, JSON.stringify({ type: 'module' }, null, 2));
