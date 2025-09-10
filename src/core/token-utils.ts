import type { DesignTokens, Token, TokenGroup } from './types.js';
import picomatch from 'picomatch';
import leven from 'leven';

const ALIAS_PATTERN = /^\{([^}]+)\}$/;

export type TokenPattern = string | RegExp;

export function matchToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  for (const p of patterns) {
    if (p instanceof RegExp) {
      if (p.test(name)) return name;
    } else if (picomatch.isMatch(name, p, { nocase: true })) {
      return name;
    }
  }
  return null;
}

export function closestToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  const tokens = patterns.filter((p): p is string => typeof p === 'string');
  if (tokens.length === 0) return null;
  let best = tokens[0];
  let bestDistance = leven(name, best);
  for (const token of tokens.slice(1)) {
    const distance = leven(name, token);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = token;
    }
  }
  return best;
}

export interface FlattenedToken {
  path: string;
  token: Token;
}

export function flattenDesignTokens(tokens: DesignTokens): FlattenedToken[] {
  const result: FlattenedToken[] = [];
  const map = new Map<string, Token>();
  function walk(
    group: TokenGroup,
    prefix: string[],
    inheritedType?: string,
    inheritedDeprecated?: boolean | string,
  ): void {
    const currentType = group.$type ?? inheritedType;
    const currentDeprecated = group.$deprecated ?? inheritedDeprecated;
    for (const name of Object.keys(group)) {
      if (name.startsWith('$')) continue;
      const node = (group as Record<string, TokenGroup | Token | undefined>)[
        name
      ];
      if (node === undefined) continue;
      const path = [...prefix, name];
      if (isToken(node)) {
        const token: Token = {
          ...node,
          $type: node.$type ?? currentType,
        };
        const tokenDeprecated = token.$deprecated ?? currentDeprecated;
        if (tokenDeprecated !== undefined) token.$deprecated = tokenDeprecated;
        const key = path.join('.');
        result.push({ path: key, token });
        map.set(key, token);
      } else {
        walk(node, path, currentType, currentDeprecated);
      }
    }
  }
  walk(tokens, [], undefined, undefined);

  function resolveAlias(targetPath: string, stack: string[]): Token {
    if (stack.includes(targetPath)) {
      throw new Error(
        `Circular alias reference: ${[...stack, targetPath].join(' -> ')}`,
      );
    }
    const target = map.get(targetPath);
    if (!target) {
      const source = stack[0];
      throw new Error(
        `Token ${source} references unknown token: ${targetPath}`,
      );
    }
    const val = target.$value;
    if (typeof val === 'string') {
      const m = ALIAS_PATTERN.exec(val);
      if (m) return resolveAlias(m[1], [...stack, targetPath]);
    }
    if (target.$type === undefined) {
      const source = stack[0];
      throw new Error(
        `Token ${source} references token without $type: ${targetPath}`,
      );
    }
    if (target.$value === undefined) {
      const source = stack[0];
      throw new Error(
        `Token ${source} references token without $value: ${targetPath}`,
      );
    }
    return target;
  }

  for (const item of result) {
    const val = item.token.$value;
    if (typeof val === 'string') {
      const m = ALIAS_PATTERN.exec(val);
      if (m) {
        const resolved = resolveAlias(m[1], [item.path]);
        if (
          item.token.$type !== undefined &&
          resolved.$type !== undefined &&
          item.token.$type !== resolved.$type
        ) {
          throw new Error(
            `Token ${item.path} references token of type ${resolved.$type}; expected ${item.token.$type}`,
          );
        }
        item.token.$type = item.token.$type ?? resolved.$type;
        item.token.$value = resolved.$value;
      }
    }
  }

  return result;
}

export function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens>,
  theme = 'default',
): FlattenedToken[] {
  if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
    return flattenDesignTokens(tokensByTheme[theme]);
  }
  return [];
}

function isToken(node: Token | TokenGroup): node is Token {
  return '$value' in node;
}

export function extractVarName(value: string): string | null {
  const m = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/.exec(value.trim());
  return m ? m[1] : null;
}
