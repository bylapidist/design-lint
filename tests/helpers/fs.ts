import fs from 'node:fs';

export function readWhenReady(p: string, timeoutMs = 2000) {
  const start = Date.now();
  while (true) {
    if (fs.existsSync(p)) {
      const s = fs.statSync(p);
      if (s.size > 0) return fs.readFileSync(p, 'utf8');
    }
    if (Date.now() - start > timeoutMs)
      throw new Error(`Timed out waiting for ${p}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
  }
}
