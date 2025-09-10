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

function hasLoc(
  err: unknown,
): err is { loc: { line: number; column: number } } {
  return (
    isObject(err) &&
    'loc' in err &&
    isObject(err.loc) &&
    'line' in err.loc &&
    typeof err.loc.line === 'number' &&
    'column' in err.loc &&
    typeof err.loc.column === 'number'
  );
}

function formatDiagnostic(
  filePath: string,
  content: string,
  line: number,
  column: number,
  message: string,
): string {
  const lines = content.split(/\r?\n/);
  const excerpt = lines[line - 1] ?? '';
  const caret = ' '.repeat(column - 1) + '^';
  return `${filePath}:${String(line)}:${String(column)}\n${excerpt}\n${caret}\n${message}`;
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
      if (isObject(node)) {
        if ('name' in node && typeof node.name === 'string') return node.name;
        if ('value' in node && typeof node.value === 'string')
          return node.value;
      }
      return '';
    }

    function walk(value: unknown, prefix: string[]): void {
      if (
        !isObject(value) ||
        value.type !== 'Object' ||
        !Array.isArray(value.members) ||
        !isObject(value.loc) ||
        !('start' in value.loc) ||
        !isObject(value.loc.start) ||
        typeof value.loc.start.line !== 'number' ||
        typeof value.loc.start.column !== 'number'
      ) {
        return;
      }
      const pathId = prefix.join('.');
      if (pathId) {
        locations.set(pathId, {
          line: value.loc.start.line,
          column: value.loc.start.column,
        });
      }
      for (const m of value.members) {
        if (!isObject(m) || !('name' in m) || !('value' in m)) continue;
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
    if (isObject(error) && 'node' in error) {
      const node = error.node;
      if (isObject(node) && 'loc' in node) {
        const loc = node.loc;
        if (isObject(loc) && 'start' in loc) {
          const start = loc.start;
          if (
            isObject(start) &&
            typeof start.line === 'number' &&
            typeof start.column === 'number'
          ) {
            line = start.line;
            column = start.column;
          }
        }
      }
    } else if (isObject(error) && 'line' in error && 'column' in error) {
      const lineVal = error.line;
      const columnVal = error.column;
      if (typeof lineVal === 'number' && typeof columnVal === 'number') {
        line = lineVal;
        column = columnVal;
      }
    }
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    if (line !== undefined && column !== undefined) {
      throw new Error(
        formatDiagnostic(filePath, content, line, column, message),
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
  try {
    return parseDesignTokens(tokens, getTokenLocation);
  } catch (err) {
    if (hasLoc(err)) {
      const { line, column } = err.loc;
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err);
      throw new Error(
        formatDiagnostic(filePath, content, line, column, message),
      );
    }
    throw err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
}

export async function readDesignTokensFile(
  filePath: string,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const { tokens, getTokenLocation } = parseTokensContent(filePath, content);
  // Validate the structure but discard the result.
  try {
    parseDesignTokens(tokens, getTokenLocation);
  } catch (err) {
    if (hasLoc(err)) {
      const { line, column } = err.loc;
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err);
      throw new Error(
        formatDiagnostic(filePath, content, line, column, message),
      );
    }
    throw err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return tokens;
}
