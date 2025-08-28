import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Config } from '../core/engine';
import { configSchema } from './schema';
import { realpathIfExists } from '../utils/paths';

async function loadEsmConfig(absPath: string) {
  const url = pathToFileURL(absPath);
  const mod = await import(url.href);
  return (mod as { default?: unknown }).default ?? mod;
}

export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<Config> {
  const resolved = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  const abs = resolved ? realpathIfExists(resolved) : undefined;
  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: abs,
  };
  if (abs && fs.existsSync(abs)) {
    try {
      let loaded: Config = {};
      if (abs.endsWith('.ts') || abs.endsWith('.mts')) {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await import('ts-node/register');
          if (abs.endsWith('.mts')) {
            require.extensions['.mts'] = require.extensions['.ts'];
          }
        } catch {
          throw new Error(
            'To load TypeScript config files, please install ts-node.',
          );
        }
      }
      if (abs.endsWith('.json')) {
        loaded = JSON.parse(fs.readFileSync(abs, 'utf8')) as Config;
      } else if (isESM(abs)) {
        loaded = (await loadEsmConfig(abs)) as Config;
      } else {
        const mod = require(abs) as { default?: unknown };
        loaded = (mod?.default as Config) || (mod as Config) || {};
      }
      const merged = { ...base, ...loaded, configPath: abs };
      const result = configSchema.safeParse(merged);
      if (!result.success) {
        throw new Error(`Invalid config at ${abs}: ${result.error.message}`);
      }
      return result.data;
    } catch (err) {
      throw new Error(
        `Failed to load config at ${abs}: ${(err as Error).message}`,
      );
    }
  }
  const result = configSchema.safeParse(base);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  return result.data;
}

function findConfig(cwd: string): string | undefined {
  let dir = cwd;
  // Walk up parent directories looking for a config file
  while (true) {
    const js = path.join(dir, 'designlint.config.js');
    if (fs.existsSync(js)) return js;
    const cjs = path.join(dir, 'designlint.config.cjs');
    if (fs.existsSync(cjs)) return cjs;
    const mjs = path.join(dir, 'designlint.config.mjs');
    if (fs.existsSync(mjs)) return mjs;
    const ts = path.join(dir, 'designlint.config.ts');
    if (fs.existsSync(ts)) return ts;
    const mts = path.join(dir, 'designlint.config.mts');
    if (fs.existsSync(mts)) return mts;
    const json = path.join(dir, 'designlint.config.json');
    if (fs.existsSync(json)) return json;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function isESM(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (ext === '.mjs') return true;
  if (ext === '.cjs' || ext === '.cts' || ext === '.mts') return false;
  if (ext !== '.js' && ext !== '.ts') return false;
  let dir = path.dirname(filePath);
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
          type?: string;
        };
        return pkg.type === 'module';
      } catch {
        return false;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}
