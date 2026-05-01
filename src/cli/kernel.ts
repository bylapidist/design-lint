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
  /**
   * When true, suppress stdout progress messages. Errors still go to stderr.
   * Used by auto-launch from prepareEnvironment so kernel startup messages do
   * not corrupt formatter output (e.g. JSON) on stdout.
   */
  quiet?: boolean;
  /**
   * Path to the ready sentinel file. The daemon writes this file after token
   * bootstrap completes. kernelStart() polls for it instead of the PID file
   * so it only returns once the kernel's token graph is fully populated.
   * Defaults to <socketPath>.ready.
   */
  readyFile?: string;
}

interface KernelStatusOptions {
  pidFile?: string;
}

interface KernelStopOptions {
  pidFile?: string;
  socketPath?: string;
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
  const socketPath = options.socketPath ?? DEFAULT_SOCKET_PATH;
  // The ready file is written by the daemon after token bootstrap completes.
  // Polling for it (rather than the PID file) ensures the kernel's token graph
  // is fully populated before kernelStart returns.
  const readyFile =
    options.readyFile ?? socketPath.replace(/\.sock$/, '.ready');

  const log = options.quiet
    ? () => undefined
    : (msg: string) => {
        console.log(msg);
      };

  const existingPid = readPid(pidFile);
  if (existingPid !== null && isProcessRunning(existingPid)) {
    log(
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
  args.push('--ready-file', readyFile);

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  // Poll for the ready file — written by the daemon after token bootstrap
  // completes. This is later than the PID file (written by KernelProcess.start
  // before bootstrap), so polling here guarantees tokens are loaded when we
  // return. 5 s to allow for process spawn overhead + bootstrap time in CI.
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const spawnResult = spawnSync('sleep', ['0.1']);
    void spawnResult;
    if (fs.existsSync(readyFile)) {
      log(`Kernel started (PID ${readPid(pidFile)?.toString() ?? '?'})`);
      log(`  Socket: ${socketPath}`);
      if (!options.noHttp) {
        log(
          `  HTTP:   http://127.0.0.1:${(options.httpPort ?? DEFAULT_HTTP_PORT).toString()}/kwp/status`,
        );
      }
      return;
    }
  }

  console.error(
    'Kernel did not start within 5 seconds. Check system logs for details.',
  );
  process.exitCode = 1;
}

/**
 * Stop the running kernel daemon by sending SIGTERM.
 */
export function kernelStop(options: KernelStopOptions): void {
  const pidFile = options.pidFile ?? DEFAULT_PID_FILE;
  const socketPath = options.socketPath ?? DEFAULT_SOCKET_PATH;
  const readyFile = socketPath.replace(/\.sock$/, '.ready');
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
    try {
      fs.unlinkSync(readyFile);
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
