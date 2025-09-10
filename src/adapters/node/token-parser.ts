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

function parseTokensContent(
  filePath: string,
  content: string,
): {
  tokens: DesignTokens;
  getTokenLocation: (path: string) => { line: number; column: number };
} {
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

    const locations = new Map<string, { line: number; column: number }>();

    function getName(node: unknown): string {
      if (isObject(node) && typeof node.type === 'string') {
        if (node.type === 'Identifier' && typeof node.name === 'string') {
          return node.name;
        }
        if (typeof node.value === 'string') {
          return node.value;
        }
      }
      return '';
    }

    function walk(value: unknown, prefix: string[]): void {
      if (!isObject(value) || value.type !== 'Object') return;
      const members = Array.isArray(value.members) ? value.members : [];
      const hasValue = members.some((m) => {
        if (!isObject(m)) return false;
        return getName(m.name) === '$value';
      });
      if (hasValue && isObject(value.loc) && isObject(value.loc.start)) {
        const line = value.loc.start.line;
        const column = value.loc.start.column;
        if (typeof line === 'number' && typeof column === 'number') {
          locations.set(prefix.join('.'), { line, column });
        }
      }
      for (const m of members) {
        if (!isObject(m)) continue;
        const name = getName(m.name);
        if (name.startsWith('$')) continue;
        walk(m.value, [...prefix, name]);
      }
    }

    walk(doc.body, []);

    const result = evaluate(doc.body);
    if (!isDesignTokens(result)) {
      throw new Error(
        `Error parsing ${filePath}: root value must be an object`,
      );
    }
    return {
      tokens: result,
      getTokenLocation: (path) => locations.get(path) ?? { line: 1, column: 1 },
    };
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
  const { tokens, getTokenLocation } = parseTokensContent(filePath, content);
  return parseDesignTokens(tokens, getTokenLocation);
}

export async function readDesignTokensFile(
  filePath: string,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const { tokens, getTokenLocation } = parseTokensContent(filePath, content);
  // Validate the structure but discard the result.
  parseDesignTokens(tokens, getTokenLocation);
  return tokens;
}
