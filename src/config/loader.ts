import fs from 'fs';
import path from 'path';
import type { Config } from '../core/engine';

export function loadConfig(cwd: string, configPath?: string): Config {
  const resolved = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  const base: Config = { tokens: {}, rules: {}, ignoreFiles: [] };
  if (resolved && fs.existsSync(resolved)) {
    const loaded = resolved.endsWith('.json')
      ? (JSON.parse(fs.readFileSync(resolved, 'utf8')) as Config)
      : // eslint-disable-next-line @typescript-eslint/no-var-requires
        (require(resolved) as Config) || {};
    return { ...base, ...loaded };
  }
  return base;
}

function findConfig(cwd: string): string | undefined {
  const js = path.join(cwd, 'designlint.config.js');
  if (fs.existsSync(js)) return js;
  const json = path.join(cwd, 'designlint.config.json');
  if (fs.existsSync(json)) return json;
  return undefined;
}
