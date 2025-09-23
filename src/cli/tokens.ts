import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loader.js';
import { toThemeRecord } from '../utils/tokens/index.js';
import { TokenRegistry } from '../core/token-registry.js';

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
 * @param onWarn - Optional callback for alias resolution or parse warnings.
 */
export async function exportTokens(
  options: TokensCommandOptions,
  onWarn?: (msg: string) => void,
): Promise<void> {
  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  const registry = await TokenRegistry.create(tokensByTheme, {
    nameTransform: config.nameTransform,
    onWarn,
  });
  const themes = options.theme ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, unknown>> = {};

  for (const theme of themes) {
    const flat = registry.getTokens(theme);
    output[theme] = {};
    for (const { path: p, value, type, aliases, metadata } of flat) {
      // Prevent prototype pollution from malicious keys
      if (p === '__proto__' || p === 'constructor' || p === 'prototype')
        continue;
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
