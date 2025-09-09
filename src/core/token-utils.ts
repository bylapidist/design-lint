import type {
  LegacyDesignTokens,
  VariableDefinition,
  DesignTokens,
  Token,
  TokenGroup,
} from './types.js';
import picomatch from 'picomatch';
import leven from 'leven';

export type TokenPattern = string | RegExp;

export interface NormalizedTokens {
  themes: Record<string, LegacyDesignTokens>;
  merged: LegacyDesignTokens;
}

const TOKEN_GROUPS = [
  'colors',
  'spacing',
  'zIndex',
  'borderRadius',
  'borderWidths',
  'shadows',
  'durations',
  'animations',
  'blurs',
  'borderColors',
  'opacity',
  'outlines',
  'fontSizes',
  'fonts',
  'lineHeights',
  'fontWeights',
  'letterSpacings',
  'variables',
  'deprecations',
];

function isMultiTheme(
  tokens: LegacyDesignTokens | Record<string, LegacyDesignTokens>,
): tokens is Record<string, LegacyDesignTokens> {
  return Object.keys(tokens).some((k) => !TOKEN_GROUPS.includes(k));
}

function normalizeSingle(
  tokens: LegacyDesignTokens,
  wrapVar: boolean,
): LegacyDesignTokens {
  const normalized: LegacyDesignTokens = {};
  for (const [group, defs] of Object.entries(tokens)) {
    if (Array.isArray(defs)) {
      normalized[group] = defs;
      continue;
    }
    if (!isRecord(defs)) {
      normalized[group] = defs;
      continue;
    }
    if (group === 'variables') {
      const map: Record<string, VariableDefinition> = {};
      for (const [name, value] of Object.entries(defs)) {
        if (isRecord(value)) {
          const v = value as unknown as VariableDefinition;
          map[name] = {
            id: v.id,
            modes: v.modes ? { ...v.modes } : undefined,
            aliasOf: v.aliasOf,
          };
        }
      }
      normalized[group] = map;
      continue;
    }
    const map: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(defs)) {
      if (wrapVar && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('var(')) {
          map[name] = trimmed;
        } else {
          const tokenName = trimmed.startsWith('--') ? trimmed : `--${trimmed}`;
          map[name] = `var(${tokenName})`;
        }
      } else {
        map[name] = value;
      }
    }
    normalized[group] = map;
  }
  return normalized;
}

export function mergeTokens(
  tokensByTheme: Record<string, LegacyDesignTokens>,
  themes?: string[],
): LegacyDesignTokens {
  const merged: LegacyDesignTokens = {};
  const selected = themes ?? Object.keys(tokensByTheme);
  for (const theme of selected) {
    const source = tokensByTheme[theme];
    for (const [group, defs] of Object.entries(source)) {
      if (Array.isArray(defs)) {
        const existing = merged[group];
        const target: (string | RegExp)[] = Array.isArray(existing)
          ? (existing as (string | RegExp)[])
          : [];
        const defsArray = defs as (string | RegExp)[];
        merged[group] = Array.from(
          new Set<string | RegExp>([...target, ...defsArray]),
        );
        continue;
      }
      if (!isRecord(defs)) {
        if (merged[group] === undefined) {
          merged[group] = defs;
        }
        continue;
      }
      if (group === 'variables') {
        const existing = merged[group];
        const targetMap = (isRecord(existing) ? existing : {}) as Partial<
          Record<string, VariableDefinition>
        >;
        for (const [name, value] of Object.entries(
          defs as Record<string, VariableDefinition>,
        )) {
          const current = targetMap[name];
          if (!current) {
            targetMap[name] = {
              id: value.id,
              modes: value.modes ? { ...value.modes } : undefined,
              aliasOf: value.aliasOf,
            };
          } else {
            if (value.modes) {
              current.modes = { ...(current.modes ?? {}), ...value.modes };
            }
            if (current.aliasOf === undefined && value.aliasOf !== undefined) {
              current.aliasOf = value.aliasOf;
            }
          }
        }
        merged[group] = targetMap as Record<string, VariableDefinition>;
        continue;
      }
      const existing = merged[group];
      const targetMap: Record<string, unknown> = isRecord(existing)
        ? existing
        : {};
      for (const [name, value] of Object.entries(defs)) {
        if (!(name in targetMap)) targetMap[name] = value;
      }
      merged[group] = targetMap;
    }
  }
  return merged;
}

export function normalizeTokens(
  tokens: LegacyDesignTokens | Record<string, LegacyDesignTokens> | undefined,
  wrapVar = false,
): NormalizedTokens {
  const themes: Record<string, LegacyDesignTokens> = {};
  if (!tokens) return { themes, merged: {} };
  if (isMultiTheme(tokens)) {
    for (const [theme, defs] of Object.entries(tokens)) {
      themes[theme] = normalizeSingle(defs, wrapVar);
    }
  } else {
    themes.default = normalizeSingle(tokens, wrapVar);
  }
  return { themes, merged: mergeTokens(themes) };
}

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
        result.push({ path: path.join('.'), token });
      } else {
        walk(node, path, currentType, currentDeprecated);
      }
    }
  }
  walk(tokens, [], undefined, undefined);
  return result;
}

function isToken(node: Token | TokenGroup): node is Token {
  return '$value' in node;
}

export function extractVarName(value: string): string | null {
  const m = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/.exec(value.trim());
  return m ? m[1] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
