import fs from 'fs';
import path from 'path';
import type { Config } from '../core/engine';

export function loadConfig(cwd: string, configPath?: string): Config {
  const resolved = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  if (resolved && fs.existsSync(resolved)) {
    if (resolved.endsWith('.json')) {
      return JSON.parse(fs.readFileSync(resolved, 'utf8')) as Config;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(resolved) as Config;
  }
  return {};
}

function findConfig(cwd: string): string | undefined {
  const js = path.join(cwd, 'designlint.config.js');
  const json = path.join(cwd, 'designlint.config.json');
  if (fs.existsSync(js)) return js;
  if (fs.existsSync(json)) return json;
  return undefined;
}
