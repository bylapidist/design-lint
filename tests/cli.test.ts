import fs from 'fs';
import os from 'os';
import path from 'path';
import { run } from '../src/cli';

describe('CLI', () => {
  it('exits with code 1 on error', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
    fs.writeFileSync(
      path.join(dir, 'designlint.config.js'),
      'module.exports={tokens:{colors:{primary:"#fff"}},rules:{"design-token/colors":"error"}};',
    );
    fs.writeFileSync(path.join(dir, 'a.ts'), 'const c = "#000000";');
    const logs: string[] = [];
    const orig = console.log;
    console.log = (m: unknown) => {
      logs.push(String(m));
    };
    await run([dir]);
    console.log = orig;
    expect(process.exitCode).toBe(1);
    expect(logs.join('\n')).toContain('Unexpected color');
    process.exitCode = 0;
  });
});
