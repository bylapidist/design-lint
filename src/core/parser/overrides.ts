import type {
  FallbackEntry,
  FallbackChain,
  OverrideRule,
  Overrides,
} from '@lapidist/dtif-schema';
import { extractPointerFragment } from '../../utils/tokens/index.js';
import type {
  DesignTokens,
  FlattenedToken,
  TokenOverride,
  TokenOverrideFallback,
} from '../types.js';
import {
  validatorRegistry,
  type TokenValidator,
  type ValidationTokenInfo,
} from '../token-validators/index.js';

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function describeOverrideLocation(
  token: Pick<FlattenedToken, 'path'>,
  index: number,
): string {
  return `${token.path}[$overrides][${String(index)}]`;
}

function describeOverrideValueLocation(
  token: Pick<FlattenedToken, 'path'>,
  index: number,
): string {
  return `${describeOverrideLocation(token, index)}[$value]`;
}

function describeOverrideFallbackLocation(
  token: Pick<FlattenedToken, 'path'>,
  index: number,
  fallbackPath: number[],
): string {
  let location = describeOverrideLocation(token, index);
  for (const segment of fallbackPath) {
    location += `[$fallback][${String(segment)}]`;
  }
  return location;
}

function describeOverrideFallbackValueLocation(
  token: Pick<FlattenedToken, 'path'>,
  index: number,
  fallbackPath: number[],
): string {
  return `${describeOverrideFallbackLocation(token, index, fallbackPath)}[$value]`;
}

interface OverrideProcessingContext {
  token: FlattenedToken;
  overrideIndex: number;
  validator: TokenValidator;
  validationMap: Map<string, ValidationTokenInfo>;
  tokensByPointer: Map<string, FlattenedToken>;
  warnings: string[];
  references: Set<string>;
}

function normalizeFallbackEntry(
  entry: FallbackEntry,
  context: OverrideProcessingContext,
  path: number[],
): TokenOverrideFallback {
  const {
    token,
    overrideIndex,
    validator,
    validationMap,
    tokensByPointer,
    warnings,
    references,
  } = context;
  const normalized: TokenOverrideFallback = {};

  if (typeof entry.$ref === 'string') {
    normalized.ref = entry.$ref;
    const fragment = extractPointerFragment(entry.$ref);
    if (!fragment || fragment === '#') {
      warnings.push(
        `Override for token ${token.path} references unsupported fallback $ref ${entry.$ref}`,
      );
    } else {
      references.add(fragment);
      const referenced = tokensByPointer.get(fragment);
      if (!referenced) {
        throw new Error(
          `Override for token ${token.path} references unknown fallback $ref ${entry.$ref}`,
        );
      }
      normalized.refPath = referenced.path;
      if (token.type && referenced.type && token.type !== referenced.type) {
        warnings.push(
          `Override for token ${token.path} references fallback $ref ${entry.$ref} with mismatched $type ${referenced.type}; expected ${token.type}`,
        );
      }
    }
  }

  if (hasOwn(entry, '$value')) {
    const location = describeOverrideFallbackValueLocation(
      token,
      overrideIndex,
      path,
    );
    validator(entry.$value, location, validationMap);
    normalized.value = entry.$value;
  }

  if (entry.$fallback !== undefined) {
    normalized.fallback = normalizeOverrideFallback(
      entry.$fallback,
      context,
      path,
    );
  }

  return normalized;
}

function normalizeOverrideFallback(
  chain: FallbackChain,
  context: OverrideProcessingContext,
  ancestry: number[] = [],
): TokenOverrideFallback[] {
  const entries = Array.isArray(chain) ? chain : [chain];
  return entries.map((entry, index) =>
    normalizeFallbackEntry(entry, context, [...ancestry, index]),
  );
}

function createValidationMap(
  tokens: FlattenedToken[],
): Map<string, ValidationTokenInfo> {
  return new Map(
    tokens.map((token) => [
      token.pointer,
      {
        $value: token.value,
        ...(token.type ? { $type: token.type } : {}),
      },
    ]),
  );
}
function normalizeOverride(
  rule: OverrideRule,
  index: number,
  tokensByPointer: Map<string, FlattenedToken>,
  validationMap: Map<string, ValidationTokenInfo>,
  warnings: string[],
): { override: TokenOverride; references: Set<string> } {
  if (typeof rule.$token !== 'string') {
    throw new Error(
      `Override at index ${String(index)} is missing $token pointer`,
    );
  }

  const targetFragment = extractPointerFragment(rule.$token);
  if (!targetFragment || targetFragment === '#') {
    throw new Error(
      `Override for $token ${rule.$token} must reference a token in the same document`,
    );
  }

  const target = tokensByPointer.get(targetFragment);
  if (!target) {
    throw new Error(
      `Override for $token ${rule.$token} references unknown token`,
    );
  }

  if (!target.type) {
    throw new Error(
      `Override for token ${target.path} cannot be applied because the token is missing $type`,
    );
  }

  const validator = validatorRegistry.get(target.type);
  if (!validator) {
    throw new Error(
      `Override for token ${target.path} cannot be applied because $type ${target.type} is not registered`,
    );
  }

  const override: TokenOverride = {
    pointer: rule.$token,
    path: target.path,
    conditions: rule.$when,
  };
  const references = new Set<string>();

  if (hasOwn(rule, '$ref') && typeof rule.$ref === 'string') {
    override.ref = rule.$ref;
    const refFragment = extractPointerFragment(rule.$ref);
    if (!refFragment || refFragment === '#') {
      warnings.push(
        `Override for token ${target.path} references unsupported $ref ${rule.$ref}`,
      );
    } else {
      references.add(refFragment);
      const referenced = tokensByPointer.get(refFragment);
      if (!referenced) {
        throw new Error(
          `Override for token ${target.path} references unknown $ref ${rule.$ref}`,
        );
      }
      override.refPath = referenced.path;
      if (referenced.type && referenced.type !== target.type) {
        warnings.push(
          `Override for token ${target.path} references $ref ${rule.$ref} with mismatched $type ${referenced.type}; expected ${target.type}`,
        );
      }
    }
  }

  if (hasOwn(rule, '$value')) {
    const location = describeOverrideValueLocation(target, index);
    validator(rule.$value, location, validationMap);
    override.value = rule.$value;
  }

  if (rule.$fallback !== undefined) {
    override.fallback = normalizeOverrideFallback(rule.$fallback, {
      token: target,
      overrideIndex: index,
      validator,
      validationMap,
      tokensByPointer,
      warnings,
      references,
    });
  }

  if (
    !override.ref &&
    !hasOwn(rule, '$value') &&
    override.fallback === undefined
  ) {
    throw new Error(
      `Override for token ${target.path} must provide $ref, $value, or $fallback`,
    );
  }

  return { override, references };
}

export function applyOverrides(
  document: DesignTokens,
  tokens: FlattenedToken[],
  warn: (msg: string) => void = console.warn,
): void {
  const overrides: Overrides | undefined = document.$overrides;
  if (!overrides || overrides.length === 0) {
    return;
  }

  const tokensByPointer = new Map(
    tokens.map((token) => [token.pointer, token]),
  );
  const tokensByPath = new Map(tokens.map((token) => [token.path, token]));
  const validationMap = createValidationMap(tokens);
  const warnings: string[] = [];

  overrides.forEach((rule, index) => {
    const { override, references } = normalizeOverride(
      rule,
      index,
      tokensByPointer,
      validationMap,
      warnings,
    );
    const target = tokensByPath.get(override.path);
    if (!target) {
      return;
    }
    target.overrides = target.overrides ?? [];
    target.overrides.push(override);

    if (references.size > 0) {
      const aliasSet = new Set(target.aliases ?? []);
      for (const ref of references) {
        aliasSet.add(ref);
      }
      target.aliases = Array.from(aliasSet);
    }
  });

  for (const message of warnings) {
    warn(message);
  }
}
