import type { DtifFlattenedToken, JsonPointer } from '../types.js';
import { createDtifNameIndex, indexDtifTokens } from './token-index.js';
import { normalizePath, type NameTransform } from '../../utils/tokens/path.js';

export interface DtifTokenRegistryOptions {
  nameTransform?: NameTransform;
}

export class DtifTokenRegistry {
  private pointerRegistry = new Map<
    string,
    Map<JsonPointer, DtifFlattenedToken>
  >();
  private nameRegistry = new Map<string, Map<string, DtifFlattenedToken>>();
  private transform?: NameTransform;

  constructor(
    tokensByTheme: Record<string, readonly DtifFlattenedToken[]>,
    options: DtifTokenRegistryOptions = {},
  ) {
    this.transform = options.nameTransform;

    for (const [theme, tokens] of Object.entries(tokensByTheme)) {
      if (theme.startsWith('$')) continue;
      const pointerIndex = indexDtifTokens(tokens);
      const nameIndex = createDtifNameIndex(tokens, this.transform);
      this.pointerRegistry.set(theme, pointerIndex);
      this.nameRegistry.set(theme, nameIndex);
    }
  }

  getByPointer(
    pointer: JsonPointer,
    theme?: string,
  ): DtifFlattenedToken | undefined {
    if (theme) {
      return this.pointerRegistry.get(theme)?.get(pointer);
    }

    const defaultTheme = this.pointerRegistry.get('default');
    if (defaultTheme?.has(pointer)) {
      return defaultTheme.get(pointer);
    }

    for (const map of this.pointerRegistry.values()) {
      const token = map.get(pointer);
      if (token) return token;
    }
    return undefined;
  }

  getByName(name: string, theme?: string): DtifFlattenedToken | undefined {
    const normalized = normalizePath(name, this.transform);
    if (theme) {
      return this.nameRegistry.get(theme)?.get(normalized);
    }

    const defaultTheme = this.nameRegistry.get('default');
    if (defaultTheme?.has(normalized)) {
      return defaultTheme.get(normalized);
    }

    for (const map of this.nameRegistry.values()) {
      const token = map.get(normalized);
      if (token) return token;
    }
    return undefined;
  }

  getTokens(theme?: string): DtifFlattenedToken[] {
    if (theme) {
      const map = this.pointerRegistry.get(theme);
      return map ? Array.from(map.values()) : [];
    }

    const merged = new Map<JsonPointer, DtifFlattenedToken>();
    for (const map of this.pointerRegistry.values()) {
      for (const [pointer, token] of map) {
        if (!merged.has(pointer)) {
          merged.set(pointer, token);
        }
      }
    }
    return Array.from(merged.values());
  }
}
