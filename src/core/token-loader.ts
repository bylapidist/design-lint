import type { DesignTokens } from './types.js';

export interface NormalizedTokens {
  themes: Record<string, DesignTokens>;
  merged: DesignTokens;
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
  'deprecations',
];

function isMultiTheme(
  tokens: DesignTokens | Record<string, DesignTokens>,
): tokens is Record<string, DesignTokens> {
  return Object.keys(tokens).some((k) => !TOKEN_GROUPS.includes(k));
}

function normalizeSingle(tokens: DesignTokens, wrapVar: boolean): DesignTokens {
  const normalized: DesignTokens = {};
  for (const [group, defs] of Object.entries(tokens)) {
    if (Array.isArray(defs)) {
      (normalized as Record<string, unknown>)[group] = defs;
      continue;
    }
    if (!defs || typeof defs !== 'object') {
      (normalized as Record<string, unknown>)[group] = defs as unknown;
      continue;
    }
    const map: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(
      defs as Record<string, unknown>,
    )) {
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
    (normalized as Record<string, unknown>)[group] = map;
  }
  return normalized;
}

export function mergeTokens(
  tokensByTheme: Record<string, DesignTokens>,
  themes?: string[],
): DesignTokens {
  const merged: DesignTokens = {};
  const selected = themes ?? Object.keys(tokensByTheme);
  for (const theme of selected) {
    const source = tokensByTheme[theme];
    if (!source) continue;
    for (const [group, defs] of Object.entries(source)) {
      if (Array.isArray(defs)) {
        const target = ((merged as Record<string, unknown>)[group] ||
          []) as unknown[];
        (merged as Record<string, unknown>)[group] = Array.from(
          new Set([...target, ...defs]),
        );
        continue;
      }
      if (!defs || typeof defs !== 'object') {
        if ((merged as Record<string, unknown>)[group] === undefined) {
          (merged as Record<string, unknown>)[group] = defs as unknown;
        }
        continue;
      }
      const targetMap = ((merged as Record<string, unknown>)[group] ||
        {}) as Record<string, unknown>;
      for (const [name, value] of Object.entries(
        defs as Record<string, unknown>,
      )) {
        if (!(name in targetMap)) targetMap[name] = value;
      }
      (merged as Record<string, unknown>)[group] = targetMap;
    }
  }
  return merged;
}

export function normalizeTokens(
  tokens: DesignTokens | Record<string, DesignTokens> | undefined,
  wrapVar = false,
): NormalizedTokens {
  const themes: Record<string, DesignTokens> = {};
  if (!tokens) return { themes, merged: {} };
  if (isMultiTheme(tokens)) {
    for (const [theme, defs] of Object.entries(tokens)) {
      themes[theme] = normalizeSingle(defs, wrapVar);
    }
  } else {
    themes.default = normalizeSingle(tokens as DesignTokens, wrapVar);
  }
  return { themes, merged: mergeTokens(themes) };
}
