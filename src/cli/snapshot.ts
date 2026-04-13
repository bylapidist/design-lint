/**
 * `design-lint export-runtime-snapshot` command implementation.
 *
 * Connects to the running DSR kernel and requests a binary snapshot export.
 * The snapshot encodes the full `KernelState` as MessagePack with an 8-byte
 * magic header (`DLRTv001`) and SHA-256 trailer.
 */
import path from 'node:path';

const DEFAULT_SOCKET_PATH = '/tmp/designlint-kernel.sock';
const DEFAULT_HTTP_PORT = 7341;
const DEFAULT_OUT = '.designlint/snapshot.bin';

interface ExportSnapshotOptions {
  out?: string;
  socketPath?: string;
  httpPort?: number;
}

/**
 * Connect to the running kernel and trigger a snapshot export.
 *
 * @param options - Command options.
 */
export async function exportRuntimeSnapshot(
  options: ExportSnapshotOptions,
): Promise<void> {
  const outPath = path.resolve(process.cwd(), options.out ?? DEFAULT_OUT);

  // Ensure the output directory exists
  const { mkdir } = await import('node:fs/promises');
  await mkdir(path.dirname(outPath), { recursive: true });

  const { UnixSocketClient } = await import('@lapidist/dsr');

  const client = new UnixSocketClient(
    options.socketPath ?? DEFAULT_SOCKET_PATH,
  );

  try {
    await client.connect();
  } catch {
    // Fall back to HTTP
    const { HttpClient } = await import('@lapidist/dsr');
    const httpClient = new HttpClient(options.httpPort ?? DEFAULT_HTTP_PORT);
    await httpClient.connect();

    const response = await httpClient.request({
      type: 'request',
      id: crypto.randomUUID(),
      method: 'kernel.snapshot',
      payload: { path: outPath },
    });

    await httpClient.disconnect();
    const hash =
      typeof response.payload === 'string' ? response.payload : '(unknown)';
    console.log(`Snapshot exported: ${outPath}`);
    console.log(`  Hash: ${hash}`);
    return;
  }

  const response = await client.request({
    type: 'request',
    id: crypto.randomUUID(),
    method: 'kernel.snapshot',
    payload: { path: outPath },
  });

  await client.disconnect();

  const hash =
    typeof response.payload === 'string' ? response.payload : '(unknown)';
  console.log(`Snapshot exported: ${outPath}`);
  console.log(`  Hash: ${hash}`);
}
