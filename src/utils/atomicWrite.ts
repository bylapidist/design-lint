import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';

/**
 * Write data to a file atomically by using a temporary file and rename.
 * @param target Destination file path.
 * @param data Data to write.
 * @returns Resolves once the file has been written.
 */
export async function writeFileAtomic(target: string, data: string | Buffer) {
  const dir = path.dirname(target);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let fh: FileHandle | undefined;
  try {
    await fs.promises.writeFile(tmp, data);
    fh = await fs.promises.open(tmp, 'r');
    await fh.sync();
    await fh.close();
    fh = undefined;
    await fs.promises.rename(tmp, target);
  } finally {
    if (fh) {
      try {
        await fh.close();
      } catch {}
    }
    try {
      await fs.promises.unlink(tmp);
    } catch {}
  }
}

/**
 * Synchronously write data to a file atomically.
 * @param target Destination file path.
 * @param data Data to write.
 */
export function writeFileAtomicSync(target: string, data: string | Buffer) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    fs.writeFileSync(tmp, data);
    fd = fs.openSync(tmp, 'r');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tmp, target);
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    try {
      if (fs.existsSync(tmp)) {
        fs.unlinkSync(tmp);
      }
    } catch {}
  }
}
