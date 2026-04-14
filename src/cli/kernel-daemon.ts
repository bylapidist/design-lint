/**
 * DSR kernel daemon entry point.
 *
 * Spawned as a detached child process by `design-lint kernel start`.
 * Starts the KernelProcess and keeps the event loop alive until a SIGTERM
 * or SIGINT signal is received.
 *
 * CLI args:
 *   --socket-path <path>   Unix socket path (default: /tmp/designlint-kernel.sock)
 *   --http-port   <n>      HTTP fallback port (default: 7341)
 *   --pid-file    <path>   PID file path (default: /tmp/designlint-kernel.pid)
 *   --no-http              Disable HTTP fallback transport
 */

interface KernelOptions {
  socketPath?: string;
  httpPort?: number;
  pidFile?: string;
  enableHttp?: boolean;
}

interface StartableKernel {
  start(): Promise<void>;
}

export type KernelProcessCtor = new (options: KernelOptions) => StartableKernel;

function parseArgs(argv: string[]): KernelOptions {
  function getArg(flag: string): string | undefined {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  }

  function hasFlag(flag: string): boolean {
    return argv.includes(flag);
  }

  const socketPath = getArg('--socket-path');
  const httpPortStr = getArg('--http-port');
  const pidFile = getArg('--pid-file');
  const noHttp = hasFlag('--no-http');

  return {
    socketPath,
    httpPort: httpPortStr !== undefined ? parseInt(httpPortStr, 10) : undefined,
    pidFile,
    enableHttp: !noHttp,
  };
}

async function loadKernelProcess(): Promise<KernelProcessCtor> {
  const { KernelProcess } = await import('@lapidist/dsr');
  return KernelProcess;
}

/**
 * Start the kernel daemon.
 *
 * Accepts an optional KernelProcess constructor so the function can be tested
 * without spawning a real kernel.
 *
 * @param argv - CLI arguments (defaults to process.argv.slice(2)).
 * @param KernelProcessClass - Optional KernelProcess constructor override.
 */
export async function startDaemon(
  argv = process.argv.slice(2),
  KernelProcessClass?: KernelProcessCtor,
): Promise<void> {
  const options = parseArgs(argv);
  const Ctor = KernelProcessClass ?? (await loadKernelProcess());
  const kernel = new Ctor(options);
  await kernel.start();
  console.log(`[kernel-daemon] started (PID ${process.pid.toString()})`);
}

// Run when invoked as a standalone process (not when imported in tests).
if (!process.env.DESIGN_LINT_TEST_MODE) {
  await startDaemon();
}
