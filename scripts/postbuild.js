#!/usr/bin/env node
import { chmodSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cli = join(__dirname, '..', 'dist', 'cli', 'index.js');

if (existsSync(cli)) chmodSync(cli, 0o755);
