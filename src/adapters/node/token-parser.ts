import { readFile } from 'node:fs/promises';
import type { DesignTokens } from '../../core/types.js';
import type { FlattenedToken } from '../../core/token-utils.js';
import { parseDesignTokens } from '../../core/token-parser.js';

function assertSupportedFile(filePath: string): void {
  if (!(filePath.endsWith('.tokens') || filePath.endsWith('.tokens.json'))) {
    throw new Error(`Unsupported design tokens file: ${filePath}`);
  }
}

export async function parseDesignTokensFile(
  filePath: string,
): Promise<FlattenedToken[]> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const json = JSON.parse(content) as DesignTokens;
  return parseDesignTokens(json);
}

export async function readDesignTokensFile(
  filePath: string,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const json = JSON.parse(content) as DesignTokens;
  // Validate the structure but discard the result.
  parseDesignTokens(json);
  return json;
}
