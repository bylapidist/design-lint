/**
 * `design-lint kernel` subcommand implementation.
 *
 * Manages the DSR kernel daemon process:
 *   start   — launches the kernel in the background
 *   stop    — signals the running kernel to shut down
 *   status  — prints kernel status (PID, uptime, snapshot hash)
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PID_FILE = '/tmp/designlint-kernel.pid';
const DEFAULT_SOCKET_PATH = '/tmp/designlint-kernel.sock';
const DEFAULT_HTTP_PORT = 7341;

interface KernelStartOptions {
  socketPath?: string;
  httpPort?: number;
  pidFile?: string;
  noHttp?: boolean;
  /** Path to designlint.config.* — when provided, tokens are loaded into the kernel on startup. */
  configPath?: string;
}

interface KernelStatusOptions {
  pidFile?: string;
}

interface KernelStopOptions {
  pidFile?: string;
}

function readPid(pidFile: string): number | null {
  try {
    const content = fs.readFileSync(pidFile, 'utf8');
    const pid = parseInt(content.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the DSR kernel daemon in the background.
 */
export function kernelStart(options: KernelStartOptions): void {
  const pidFile = options.pidFile ?? DEFAULT_PID_FILE;

  const existingPid = readPid(pidFile);
  if (existingPid !== null && isProcessRunning(existingPid)) {
    console.log(
      `Kernel is already running (PID ${existingPid.toString()}). Use 'design-lint kernel status' to inspect.`,
    );
    return;
  }

  // Resolve the kernel entry point — shipped as dist/cli/kernel-daemon.js
  const daemonPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    'kernel-daemon.js',
  );

  const args: string[] = [daemonPath];
  if (options.socketPath) args.push('--socket-path', options.socketPath);
  if (options.httpPort !== undefined)
    args.push('--http-port', options.httpPort.toString());
  if (options.pidFile) args.push('--pid-file', options.pidFile);
  if (options.noHttp) args.push('--no-http');
  if (options.configPath) args.push('--config-path', options.configPath);

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  // Brief pause to let the daemon write its PID file
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const spawnResult = spawnSync('sleep', ['0.1']);
    void spawnResult;
    const pid = readPid(pidFile);
    if (pid !== null && isProcessRunning(pid)) {
      console.log(`Kernel started (PID ${pid.toString()})`);
      console.log(`  Socket: ${options.socketPath ?? DEFAULT_SOCKET_PATH}`);
      if (!options.noHttp) {
        console.log(
          `  HTTP:   http://127.0.0.1:${(options.httpPort ?? DEFAULT_HTTP_PORT).toString()}/kwp/status`,
        );
      }
      return;
    }
  }

  console.error(
    'Kernel did not start within 2 seconds. Check system logs for details.',
  );
  process.exitCode = 1;
}

/**
 * Stop the running kernel daemon by sending SIGTERM.
 */
export function kernelStop(options: KernelStopOptions): void {
  const pidFile = options.pidFile ?? DEFAULT_PID_FILE;
  const pid = readPid(pidFile);

  if (pid === null) {
    console.log('No kernel PID file found — kernel may not be running.');
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(
      `Kernel process ${pid.toString()} is not running. Cleaning up stale PID file.`,
    );
    try {
      fs.unlinkSync(pidFile);
    } catch {
      /* already gone */
    }
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Kernel (PID ${pid.toString()}) signalled to stop.`);
  } catch (err) {
    console.error(
      `Failed to stop kernel: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  }
}

/**
 * Print the current kernel status to stdout.
 */
export function kernelStatus(options: KernelStatusOptions): void {
  const pidFile = options.pidFile ?? DEFAULT_PID_FILE;
  const pid = readPid(pidFile);

  if (pid === null) {
    console.log('Kernel status: stopped (no PID file)');
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(
      `Kernel status: stopped (stale PID file — process ${pid.toString()} not found)`,
    );
    return;
  }

  console.log(`Kernel status: running`);
  console.log(`  PID:    ${pid.toString()}`);
  console.log(`  Socket: ${DEFAULT_SOCKET_PATH}`);
  console.log(
    `  HTTP:   http://127.0.0.1:${DEFAULT_HTTP_PORT.toString()}/kwp/status`,
  );
}
