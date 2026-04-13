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

// Dynamically import KernelProcess so the build can tree-shake this file
// from the main CLI bundle.
const { KernelProcess } = await import('@lapidist/dsr');

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

const socketPath = getArg('--socket-path');
const httpPortStr = getArg('--http-port');
const pidFile = getArg('--pid-file');
const noHttp = hasFlag('--no-http');

const kernel = new KernelProcess({
  socketPath,
  httpPort: httpPortStr !== undefined ? parseInt(httpPortStr, 10) : undefined,
  pidFile,
  enableHttp: !noHttp,
});

await kernel.start();

console.log(`[kernel-daemon] started (PID ${process.pid.toString()})`);
