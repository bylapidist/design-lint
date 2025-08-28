import fs from 'fs';
import path from 'path';
import type { Config } from '../core/engine';

export function loadConfig(cwd: string, configPath?: string): Config {
  const resolved = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  const base: Config = { tokens: {}, rules: {}, ignoreFiles: [] };
  if (resolved && fs.existsSync(resolved)) {
    try {
      const loaded = resolved.endsWith('.json')
        ? (JSON.parse(fs.readFileSync(resolved, 'utf8')) as Config)
        : // eslint-disable-next-line @typescript-eslint/no-var-requires
          (require(resolved) as Config) || {};
      return { ...base, ...loaded };
    } catch (err) {
      throw new Error(
        `Failed to load config at ${resolved}: ${(err as Error).message}`,
      );
    }
  }
  return base;
}

function findConfig(cwd: string): string | undefined {
  let dir = cwd;
  // Walk up parent directories looking for a config file
  while (true) {
    const js = path.join(dir, 'designlint.config.js');
    if (fs.existsSync(js)) return js;
    const json = path.join(dir, 'designlint.config.json');
    if (fs.existsSync(json)) return json;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
