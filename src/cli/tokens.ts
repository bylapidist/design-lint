import fs from 'fs';
import path from 'path';
import type { DtifFlattenedToken } from '../core/types.js';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens, toThemeRecord } from '../utils/tokens/index.js';

/**
 * Options for the `tokens` CLI command.
 *
 * Allows selecting a single theme and writing output to a file instead of
 * stdout. When `config` is provided, tokens are loaded relative to that file.
 */
interface TokensCommandOptions {
  /** Theme name to export. When omitted all themes are included. */
  theme?: string;
  /** Optional file path to write the JSON output. */
  out?: string;
  /** Optional path to a configuration file. */
  config?: string;
}

/**
 * Export flattened design tokens as JSON.
 *
 * Loads token definitions from the resolved configuration, flattens them
 * per-theme, and writes the result either to stdout or to a file when `out`
 * is provided.
 *
 * @param options - Command options controlling theme selection and output path.
 */
export async function exportTokens(
  options: TokensCommandOptions,
): Promise<void> {
  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  if (options.theme && !(options.theme in tokensByTheme)) {
    const available = Object.keys(tokensByTheme).sort();
    const details =
      available.length > 0
        ? ` Available themes: ${available.join(', ')}.`
        : ' No themes are configured.';
    throw new Error(`Unknown theme "${options.theme}".${details}`);
  }
  const themes = options.theme ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, DtifFlattenedToken>> = {};

  for (const theme of themes) {
    const dtifTokens = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform: config.nameTransform,
    });
    const themeOutput: Record<string, DtifFlattenedToken> = {};
    for (const token of dtifTokens) {
      themeOutput[token.pointer] = token;
    }
    output[theme] = themeOutput;
  }

  const json = JSON.stringify(output, null, 2);
  if (options.out) {
    const filePath = path.resolve(process.cwd(), options.out);
    fs.writeFileSync(filePath, json);
  } else {
    console.log(json);
  }
}
