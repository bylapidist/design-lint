import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheManager } from '../../src/core/cache-manager.ts';
import { promises as fs } from 'fs';
import os from 'node:os';
import path from 'node:path';
import type { LintResult } from '../../src/core/types.ts';

void test('CacheManager applies fixes when enabled', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cm-'));
  const file = path.join(dir, 'a.txt');
  await fs.writeFile(file, 'bad');
  const lintFn = (text: string, filePath: string): Promise<LintResult> => {
    if (text === 'bad') {
      return Promise.resolve({
        filePath,
        messages: [
          {
            ruleId: 'test',
            message: 'bad',
            severity: 'error',
            line: 1,
            column: 1,
            fix: { range: [0, 3], text: 'good' },
          },
        ],
      });
    }
    return Promise.resolve({ filePath, messages: [] });
  };
  const manager = new CacheManager(undefined, true);
  await manager.processFile(file, lintFn);
  const updated = await fs.readFile(file, 'utf8');
  assert.equal(updated, 'good');
});
