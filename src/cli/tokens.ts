import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens } from '../core/token-utils.js';
import type { DesignTokens } from '../core/types.js';

interface TokensCommandOptions {
  theme?: string;
  out?: string;
  config?: string;
}

export async function exportTokens(options: TokensCommandOptions) {
  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(
    config.tokens as unknown as
      | DesignTokens
      | Record<string, DesignTokens>
      | undefined,
  );
  const themes = options.theme ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, unknown>> = Object.create(null);

  for (const theme of themes) {
    const flat = getFlattenedTokens(tokensByTheme, theme);
    output[theme] = Object.create(null);
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

function toThemeRecord(
  tokens: DesignTokens | Record<string, DesignTokens> | undefined,
): Record<string, DesignTokens> {
  if (!tokens) return {};
  const val = tokens as Record<string, DesignTokens>;
  const isThemeRecord = Object.values(val).every(
    (v) =>
      typeof v === 'object' && !('$value' in (v as Record<string, unknown>)),
  );
  return isThemeRecord ? val : { default: tokens as DesignTokens };
}
