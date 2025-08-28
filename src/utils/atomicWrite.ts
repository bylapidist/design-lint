import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeFileAtomicSync(target: string, data: string | Buffer) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(target)}.${randomUUID()}.tmp`);
  fs.writeFileSync(tmp, data);
  const fd = fs.openSync(tmp, 'r');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fs.renameSync(tmp, target);
}
