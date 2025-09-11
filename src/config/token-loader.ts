import path from 'node:path';
import {
  readDesignTokensFile,
  TokenParseError,
} from '../adapters/node/token-parser.js';
import { parseDesignTokens } from '../core/parser/index.js';
import { guards } from '../utils/index.js';

const { isDesignTokens, isThemeRecord } = guards.domain;
const { isRecord } = guards.data;

export async function loadTokens(
  tokens: unknown,
  baseDir: string,
): Promise<Record<string, unknown>> {
  if (!isRecord(tokens)) return {};
  const themes: Record<string, unknown> = {};
  for (const [theme, val] of Object.entries(tokens)) {
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
    return themes;
  }

  if (isDesignTokens(themes)) {
    try {
      parseDesignTokens(themes);
    } catch (err) {
      if (err instanceof TokenParseError) throw err;
      throw err instanceof Error ? err : new Error(String(err));
    }
    return themes;
  }

  return tokens;
}
