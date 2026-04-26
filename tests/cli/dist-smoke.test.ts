import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cli = path.join(__dirname, '..', '..', 'dist', 'cli', 'index.js');
const kernelDaemon = path.join(
  __dirname,
  '..',
  '..',
  'dist',
  'cli',
  'kernel-daemon.js',
);
const kernelSocketPath = path.join(
  os.tmpdir(),
  'designlint-smoke-test-kernel.sock',
);

let kernelPid: number | undefined;

before(() => {
  // Start an isolated kernel daemon for this suite. Uses a dedicated socket
  // so it does not interfere with any other running kernel instance.
  const child = spawn(
    process.execPath,
    [kernelDaemon, '--socket-path', kernelSocketPath, '--no-http'],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();
  kernelPid = child.pid;

  // Spin until the socket appears (up to 5 s).
  const deadline = Date.now() + 5_000;
  while (!fs.existsSync(kernelSocketPath) && Date.now() < deadline) {
    spawnSync('sleep', ['0.05']);
  }
});

after(() => {
  if (kernelPid !== undefined) {
    try {
      process.kill(kernelPid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
  try {
    fs.unlinkSync(kernelSocketPath);
  } catch {
    // already gone
  }
});

void test('dist CLI reports version', () => {
  const result = spawnSync(process.execPath, [cli, '--version'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\d+\.\d+\.\d+/);
});

void test('dist CLI preserves fail-on-empty exit semantics', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');

    const noFail = spawnSync(
      process.execPath,
      [
        cli,
        'missing/**/*.css',
        '--config',
        'designlint.config.json',
        '--kernel-socket-path',
        kernelSocketPath,
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(noFail.status, 0);
    assert.match(noFail.stderr, /No files matched the provided patterns/);

    const withFail = spawnSync(
      process.execPath,
      [
        cli,
        'missing/**/*.css',
        '--config',
        'designlint.config.json',
        '--kernel-socket-path',
        kernelSocketPath,
        '--fail-on-empty',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(withFail.status, 1);
    assert.match(withFail.stderr, /No files matched the provided patterns/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
