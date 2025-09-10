import type { DesignTokens, TokenGroup, Token } from '../core/types.js';

const GROUP_TYPE_MAP: Record<string, string> = {
  colors: 'color',
  borderColors: 'color',
  spacing: 'dimension',
  borderRadius: 'dimension',
  borderWidths: 'dimension',
  fontSizes: 'dimension',
  lineHeights: 'dimension',
  letterSpacings: 'dimension',
  zIndex: 'number',
  opacity: 'number',
  durations: 'duration',
  blurs: 'dimension',
  shadows: 'shadow',
  fonts: 'fontFamily',
  fontWeights: 'fontWeight',
  animations: 'string',
  outlines: 'string',
};

export const LEGACY_TOKEN_GROUPS = Object.keys(GROUP_TYPE_MAP);

export function migrateLegacyTokens(
  tokens: Record<string, unknown>,
): DesignTokens {
  const migrated: DesignTokens = {};
  for (const [group, value] of Object.entries(tokens)) {
    const type = GROUP_TYPE_MAP[group];
    if (!type) {
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const groupNode: TokenGroup = { $type: type } as TokenGroup;
    for (const [name, tokenValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const token: Token = { $value: tokenValue };
      groupNode[name] = token;
    }
    migrated[group] = groupNode;
  }
  return migrated;
}
