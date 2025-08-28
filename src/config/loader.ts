import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Config } from '../core/engine';
import { configSchema } from './schema';

const dynamicImport = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<unknown>;

export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<Config> {
  const resolved = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: resolved,
  };
  if (resolved && fs.existsSync(resolved)) {
    try {
      let loaded: Config = {};
      if (resolved.endsWith('.ts') || resolved.endsWith('.mts')) {
        try {
          await dynamicImport('ts-node/register');
          if (resolved.endsWith('.mts')) {
            require.extensions['.mts'] = require.extensions['.ts'];
          }
        } catch {
          throw new Error(
            'To load TypeScript config files, please install ts-node.',
          );
        }
      }
      if (resolved.endsWith('.json')) {
        loaded = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Config;
      } else if (isESM(resolved)) {
        const mod = (await dynamicImport(pathToFileURL(resolved).href)) as {
          default?: unknown;
        };
        loaded = (mod.default || mod) as Config;
      } else {
        const mod = require(resolved) as { default?: unknown };
        loaded = (mod?.default as Config) || (mod as Config) || {};
      }
      const merged = { ...base, ...loaded, configPath: resolved };
      const result = configSchema.safeParse(merged);
      if (!result.success) {
        throw new Error(
          `Invalid config at ${resolved}: ${result.error.message}`,
        );
      }
      return result.data;
    } catch (err) {
      throw new Error(
        `Failed to load config at ${resolved}: ${(err as Error).message}`,
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
