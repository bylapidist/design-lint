import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens } from '../utils/tokens/index.js';
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { guards } from '../utils/index.js';

const {
  domain: { isDesignTokens, isThemeRecord },
} = guards;

interface TokensCommandOptions {
  theme?: string;
  out?: string;
  config?: string;
}

export async function exportTokens(
  options: TokensCommandOptions,
  onWarn?: (msg: string) => void,
) {
  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  const themes = options.theme ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, unknown>> = {};

  for (const theme of themes) {
    const flat = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform: config.nameTransform,
      onWarn,
    });
    output[theme] = {};
    for (const { path: p, value, type, aliases, metadata } of flat) {
      output[theme][p] = {
        value,
        type,
        ...(aliases ? { aliases } : {}),
        ...metadata,
      };
    }
  }

  const json = JSON.stringify(output, null, 2);
  if (options.out) {
    const filePath = path.resolve(process.cwd(), options.out);
    fs.writeFileSync(filePath, json);
  } else {
    console.log(json);
  }
}

export function toThemeRecord(
  tokens: Config['tokens'],
): Record<string, DesignTokens> {
  if (!tokens) return {};
  if (isThemeRecord(tokens)) return tokens;
  if (isDesignTokens(tokens)) return { default: tokens };
  return {};
}
