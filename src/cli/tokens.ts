import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens } from '../core/token-utils.js';
import type { DesignTokens } from '../core/types.js';
import { isDesignTokens } from '../utils/is-design-tokens.js';
import { isThemeRecord } from '../utils/is-theme-record.js';

interface TokensCommandOptions {
  theme?: string;
  out?: string;
  config?: string;
}

export async function exportTokens(options: TokensCommandOptions) {
  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  const themes = options.theme ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, unknown>> = {};

  for (const theme of themes) {
    const flat = getFlattenedTokens(tokensByTheme, theme);
    output[theme] = {};
    for (const { path: p, token } of flat) {
      output[theme][p] = token;
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

function toThemeRecord(tokens: unknown): Record<string, DesignTokens> {
  if (isThemeRecord(tokens)) {
    return tokens;
  }
  if (isDesignTokens(tokens)) {
    return { default: tokens };
  }
  return {};
}
