#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const cli = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
fs.chmodSync(cli, 0o755);
