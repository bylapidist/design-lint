import path from 'path';
import { spawnSync } from 'child_process';

describe('design-lint e2e', () => {
  it('reports disallowed colors', () => {
    const fixture = path.join(__dirname, 'fixtures/sample');
    const result = spawnSync(
      'node',
      ['-r', 'ts-node/register', 'src/cli/index.ts', fixture],
      {
        encoding: 'utf8',
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('design-token/colors');
  });
});
