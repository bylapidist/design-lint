import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluate, parse as parseJson } from '@humanwhocodes/momoa';
import yamlToMomoa from 'yaml-to-momoa';
import type { DesignTokens, FlattenedToken } from '../../core/types.js';
import { parseDesignTokens } from '../../core/parser/index.js';

function assertSupportedFile(filePath: string): void {
  if (
    !(
      filePath.endsWith('.tokens') ||
      filePath.endsWith('.tokens.json') ||
      filePath.endsWith('.tokens.yaml') ||
      filePath.endsWith('.tokens.yml')
    )
  ) {
    throw new Error(`Unsupported design tokens file: ${filePath}`);
  }
}

function isDesignTokens(value: unknown): value is DesignTokens {
  return typeof value === 'object' && value !== null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasBody(value: unknown): value is { body: unknown } {
  return isObject(value) && 'body' in value;
}

function parseTokensContent(filePath: string, content: string): DesignTokens {
  const ext = path.extname(filePath).toLowerCase();
  try {
    const doc =
      ext === '.yaml' || ext === '.yml'
        ? yamlToMomoa(content)
        : parseJson(content, { mode: 'json', ranges: true });
    if (!hasBody(doc)) {
      throw new Error(
        `Error parsing ${filePath}: root value must be an object`,
      );
    }
    const result = evaluate(doc.body);
    if (!isDesignTokens(result)) {
      throw new Error(
        `Error parsing ${filePath}: root value must be an object`,
      );
    }
    return result;
  } catch (error: unknown) {
    let line: number | undefined;
    let column: number | undefined;
    if (
      isObject(error) &&
      'node' in error &&
      isObject(error.node) &&
      'loc' in error.node &&
      isObject(error.node.loc) &&
      'start' in error.node.loc &&
      isObject(error.node.loc.start) &&
      typeof error.node.loc.start.line === 'number' &&
      typeof error.node.loc.start.column === 'number'
    ) {
      line = error.node.loc.start.line;
      column = error.node.loc.start.column;
    } else if (
      isObject(error) &&
      'line' in error &&
      typeof error.line === 'number' &&
      'column' in error &&
      typeof error.column === 'number'
    ) {
      line = error.line;
      column = error.column;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (line !== undefined && column !== undefined) {
      throw new Error(
        `Error parsing ${filePath} (${String(line)}:${String(column)}): ${message}`,
      );
    }
    throw new Error(`Error parsing ${filePath}: ${message}`);
  }
}

export async function parseDesignTokensFile(
  filePath: string,
): Promise<FlattenedToken[]> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const json = parseTokensContent(filePath, content);
  return parseDesignTokens(json);
}

export async function readDesignTokensFile(
  filePath: string,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const json = parseTokensContent(filePath, content);
  // Validate the structure but discard the result.
  parseDesignTokens(json);
  return json;
}
