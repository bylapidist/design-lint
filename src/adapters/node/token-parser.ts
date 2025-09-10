import { readFile } from 'node:fs/promises';
import type { DesignTokens, FlattenedToken } from '../../core/types.js';
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json: DesignTokens = JSON.parse(content);
  return parseDesignTokens(json);
}

export async function readDesignTokensFile(
  filePath: string,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json: DesignTokens = JSON.parse(content);
  // Validate the structure but discard the result.
  parseDesignTokens(json);
  return json;
}
