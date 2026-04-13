/**
 * Tests for the kernel start/stop/status CLI commands.
 *
 * Exercises the PID-file-based logic without spawning a real DSR kernel.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { kernelStop, kernelStatus } from '../../src/cli/kernel.js';

function makePidFile(): string {
  return path.join(
    tmpdir(),
    `dl-test-kernel-${Date.now().toString()}-${Math.random().toString(36).slice(2)}.pid`,
  );
}

// ---------------------------------------------------------------------------
// kernelStatus
// ---------------------------------------------------------------------------

void test('kernelStatus prints stopped when no PID file exists', () => {
  const pidFile = makePidFile();
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStatus({ pidFile });
  } finally {
    console.log = orig;
  }
  assert.ok(lines.some((l) => l.includes('stopped')));
});

void test('kernelStatus prints stopped with stale PID', () => {
  const pidFile = makePidFile();
  // Write a PID that is extremely unlikely to be a real process
  fs.writeFileSync(pidFile, '999999999');
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStatus({ pidFile });
  } finally {
    console.log = orig;
    try {
      fs.unlinkSync(pidFile);
    } catch {
      /* already gone */
    }
  }
  assert.ok(lines.some((l) => l.includes('stopped')));
});

void test('kernelStatus prints running when PID file contains own PID', () => {
  const pidFile = makePidFile();
  fs.writeFileSync(pidFile, process.pid.toString());
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStatus({ pidFile });
  } finally {
    console.log = orig;
    try {
      fs.unlinkSync(pidFile);
    } catch {
      /* already gone */
    }
  }
  assert.ok(lines.some((l) => l.includes('running')));
});

// ---------------------------------------------------------------------------
// kernelStop
// ---------------------------------------------------------------------------

void test('kernelStop prints message when no PID file exists', () => {
  const pidFile = makePidFile();
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStop({ pidFile });
  } finally {
    console.log = orig;
  }
  assert.ok(
    lines.some((l) => l.includes('not running') || l.includes('No kernel')),
  );
});

void test('kernelStop removes stale PID file when process not found', () => {
  const pidFile = makePidFile();
  fs.writeFileSync(pidFile, '999999999');
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStop({ pidFile });
  } finally {
    console.log = orig;
  }
  assert.ok(!fs.existsSync(pidFile), 'stale PID file should be removed');
  assert.ok(lines.some((l) => l.includes('not running')));
});

void test('kernelStop with invalid PID content treats as no PID file', () => {
  const pidFile = makePidFile();
  fs.writeFileSync(pidFile, 'not-a-number');
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    kernelStop({ pidFile });
  } finally {
    console.log = orig;
    try {
      fs.unlinkSync(pidFile);
    } catch {
      /* already gone */
    }
  }
  assert.ok(
    lines.some((l) => l.includes('not running') || l.includes('No kernel')),
  );
});
