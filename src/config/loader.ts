import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import type { Config } from '../core/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../adapters/node/utils/paths.js';
import {
  readDesignTokensFile,
  TokenParseError,
} from '../adapters/node/token-parser.js';
import { parseDesignTokens } from '../core/parser/index.js';
import type { DesignTokens } from '../core/types.js';

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
  const explorer = cosmiconfig('designlint', {
    searchPlaces: [
      'package.json',
      'designlint.config.ts',
      'designlint.config.mts',
      'designlint.config.js',
      'designlint.config.mjs',
      'designlint.config.cjs',
      'designlint.config.json',
      '.designlintrc',
      '.designlintrc.json',
      '.designlintrc.yaml',
      '.designlintrc.yml',
      '.designlintrc.js',
      '.designlintrc.cjs',
      '.designlintrc.mjs',
      '.designlintrc.ts',
      '.designlintrc.mts',
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    searchStrategy: 'global',
  });

  let result: { config: unknown; filepath: string } | null;
  if (configPath) {
    const abs = path.resolve(cwd, configPath);
    try {
      await fs.promises.access(abs);
    } catch {
      throw new Error(
        `Config file not found at ${abs}. Run \`npx design-lint init\` to create a config.`,
      );
    }
    result = await explorer.load(abs);
  } else {
    result = await explorer.search(cwd);
  }

  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: result?.filepath
      ? realpathIfExists(result.filepath)
      : undefined,
  };
  const isObject = (val: unknown): val is Record<string, unknown> =>
    typeof val === 'object' && val !== null;
  const merged = {
    ...base,
    ...(isObject(result?.config) ? result.config : {}),
  };
  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    const location = result?.filepath ? ` at ${result.filepath}` : '';
    throw new Error(`Invalid config${location}: ${parsed.error.message}`);
  }
  const config = parsed.data;
  if (config.tokens && typeof config.tokens === 'object') {
    const baseDir = config.configPath ? path.dirname(config.configPath) : cwd;
    const themes: Record<string, unknown> = {};
    for (const [theme, val] of Object.entries(config.tokens)) {
      if (typeof val === 'string') {
        const filePath = path.resolve(baseDir, val);
        try {
          themes[theme] = await readDesignTokensFile(filePath);
        } catch (err) {
          if (err instanceof TokenParseError) throw err;
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Failed to read tokens for theme "${theme}": ${message}`,
          );
        }
      } else {
        themes[theme] = val;
      }
    }
    if (isThemeRecord(themes)) {
      for (const [theme, t] of Object.entries(themes)) {
        try {
          parseDesignTokens(t);
        } catch (err) {
          if (err instanceof TokenParseError) throw err;
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Failed to parse tokens for theme "${theme}": ${message}`,
          );
        }
      }
      config.tokens = themes;
    } else if (isDesignTokens(themes)) {
      try {
        parseDesignTokens(themes);
      } catch (err) {
        if (err instanceof TokenParseError) throw err;
        throw err instanceof Error ? err : new Error(String(err));
      }
      config.tokens = themes;
    }
  }
  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDesignTokens(value: unknown): value is DesignTokens {
  return isRecord(value);
}

function isThemeRecord(val: unknown): val is Record<string, DesignTokens> {
  if (!isRecord(val)) return false;
  const entries = Object.entries(val).filter(([k]) => !k.startsWith('$'));
  if (entries.length === 0) return false;
  if (entries.length === 1) {
    const [, theme] = entries[0];
    if (!isRecord(theme)) return false;
    const children = Object.entries(theme)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, v]) => v);
    const allTokens = children.every(
      (child) => isRecord(child) && ('$value' in child || 'value' in child),
    );
    return !allTokens;
  }
  let shared: string[] | null = null;
  for (const [, theme] of entries) {
    if (!isRecord(theme)) return false;
    const keys = Object.keys(theme).filter((k) => !k.startsWith('$'));
    if (shared === null) {
      shared = keys;
    } else {
      shared = shared.filter((k) => keys.includes(k));
      if (shared.length === 0) return false;
    }
  }
  return true;
}
