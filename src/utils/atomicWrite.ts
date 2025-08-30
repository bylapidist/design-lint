import writeFileAtomicLib from 'write-file-atomic';

/**
 * Write data to a file atomically.
 * @param target Destination file path.
 * @param data Data to write.
 * @param options Options forwarded to write-file-atomic.
 */
export async function writeFileAtomic(
  target: string,
  data: string | Buffer,
  options?: Parameters<typeof writeFileAtomicLib>[2],
) {
  await writeFileAtomicLib(target, data, options);
}

/**
 * Synchronously write data to a file atomically.
 * @param target Destination file path.
 * @param data Data to write.
 * @param options Options forwarded to write-file-atomic.
 */
export function writeFileAtomicSync(
  target: string,
  data: string | Buffer,
  options?: Parameters<typeof writeFileAtomicLib.sync>[2],
) {
  writeFileAtomicLib.sync(target, data, options);
}
