import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import type { Config } from '../core/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../utils/paths.js';

/**
 * Dynamically import an ECMAScript config file.
 * @param absPath Absolute path to the module.
 * @returns Loaded configuration object.
 */
async function loadEsmConfig(absPath: string) {
  const url = pathToFileURL(absPath);
  const mod = await import(url.href);
  return (mod as { default?: unknown }).default ?? mod;
}

/**
 * Resolve and load configuration for the linter.
 * @param cwd Current working directory.
 * @param configPath Optional explicit config path.
 * @returns Parsed and validated config object.
 */
export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<Config> {
  const resolved = configPath
    ? path.resolve(cwd, configPath)
    : await findConfig(cwd);
  const abs = resolved ? realpathIfExists(resolved) : undefined;
  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: abs,
  };
  if (configPath) {
    const target = abs ?? resolved;
    try {
      if (target) await fs.promises.access(target);
    } catch {
      throw new Error(`Config file not found at ${target}`);
    }
  }
  let exists = false;
  if (abs) {
    try {
      await fs.promises.access(abs);
      exists = true;
    } catch {
      exists = false;
    }
  }
  if (abs && exists) {
    try {
      let loaded: Config = {};
      if (abs.endsWith('.ts') || abs.endsWith('.mts')) {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await import('ts-node/esm');
        } catch {
          throw new Error(
            'To load TypeScript config files, please install ts-node.',
          );
        }
      }
      if (abs.endsWith('.json')) {
        const data = await fs.promises.readFile(abs, 'utf8');
        loaded = JSON.parse(data) as Config;
      } else if (isESM(abs)) {
        loaded = (await loadEsmConfig(abs)) as Config;
      } else {
        const req = createRequire(import.meta.url);
        const mod = req(abs) as { default?: unknown };
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

/**
 * Search upward from a directory for a configuration file.
 * @param cwd Directory to start from.
 * @returns Absolute path to config if found.
 */
async function findConfig(cwd: string): Promise<string | undefined> {
  let dir = cwd;
  // Walk up parent directories looking for a config file
  while (true) {
    const js = path.join(dir, 'designlint.config.js');
    try {
      const stats = await fs.promises.stat(js);
      if (stats.isFile()) return js;
    } catch {}
    const cjs = path.join(dir, 'designlint.config.cjs');
    try {
      const stats = await fs.promises.stat(cjs);
      if (stats.isFile()) return cjs;
    } catch {}
    const mjs = path.join(dir, 'designlint.config.mjs');
    try {
      const stats = await fs.promises.stat(mjs);
      if (stats.isFile()) return mjs;
    } catch {}
    const ts = path.join(dir, 'designlint.config.ts');
    try {
      const stats = await fs.promises.stat(ts);
      if (stats.isFile()) return ts;
    } catch {}
    const mts = path.join(dir, 'designlint.config.mts');
    try {
      const stats = await fs.promises.stat(mts);
      if (stats.isFile()) return mts;
    } catch {}
    const json = path.join(dir, 'designlint.config.json');
    try {
      const stats = await fs.promises.stat(json);
      if (stats.isFile()) return json;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Determine whether a file should be loaded as ESM.
 * @param filePath Path to the file.
 * @returns True if the file uses ESM semantics.
 */
function isESM(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (ext === '.mjs' || ext === '.mts') return true;
  if (ext === '.cjs' || ext === '.cts') return false;
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

export {
  loadEsmConfig as _loadEsmConfig,
  findConfig as _findConfig,
  isESM as _isESM,
};
