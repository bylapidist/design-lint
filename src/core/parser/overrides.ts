import type {
  FallbackEntry,
  OverrideRule,
  Overrides,
} from '@lapidist/dtif-schema';
import type {
  FlattenedToken,
  TokenOverride,
  TokenValueCandidate,
} from '../types.js';
import { canonicalizePointer, segmentsToPointer } from './pointers.js';

function warnTypeMismatch(
  target: FlattenedToken,
  referenced: FlattenedToken,
  context: string,
  warn?: (msg: string) => void,
): void {
  if (!warn) return;
  if (!target.type || !referenced.type) return;
  if (target.type === referenced.type) return;
  warn(
    `Override ${context} for token ${target.path} references ${referenced.path} of type ${referenced.type} (expected ${target.type})`,
  );
}

type OverrideFallback = NonNullable<OverrideRule['$fallback']>;

type TokenMap = Map<string, FlattenedToken>;

function collectFallbackEntry(
  entry: FallbackEntry,
  target: FlattenedToken,
  segments: (string | number)[],
  tokens: TokenMap,
  warn?: (msg: string) => void,
): TokenValueCandidate[] {
  const pointer = segmentsToPointer(segments);
  const candidates: TokenValueCandidate[] = [];
  let produced = false;

  if (typeof entry.$ref === 'string') {
    const refPointer = canonicalizePointer(
      entry.$ref,
      `Override ${pointer}`,
      '$ref',
    );
    const referenced = tokens.get(refPointer);
    if (!referenced) {
      throw new Error(
        `Override ${pointer} references unknown token ${refPointer}`,
      );
    }
    candidates.push({ value: referenced.value, ref: refPointer });
    warnTypeMismatch(target, referenced, pointer, warn);
    produced = true;
  }

  if (Object.prototype.hasOwnProperty.call(entry, '$value')) {
    candidates.push({ value: entry.$value });
    produced = true;
  }

  if (!produced && !entry.$fallback && warn) {
    warn(`Override ${pointer} declares neither $ref nor $value; ignoring`);
  }

  if (entry.$fallback) {
    candidates.push(
      ...collectFallbackChain(
        entry.$fallback,
        target,
        [...segments, '$fallback'],
        tokens,
        warn,
      ),
    );
  }

  return candidates;
}

function collectFallbackChain(
  fallback: OverrideFallback,
  target: FlattenedToken,
  segments: (string | number)[],
  tokens: TokenMap,
  warn?: (msg: string) => void,
): TokenValueCandidate[] {
  if (Array.isArray(fallback)) {
    const results: TokenValueCandidate[] = [];
    fallback.forEach((entry, index) => {
      results.push(
        ...collectFallbackEntry(
          entry,
          target,
          [...segments, index],
          tokens,
          warn,
        ),
      );
    });
    return results;
  }
  return collectFallbackEntry(fallback, target, segments, tokens, warn);
}

export function applyOverrides(
  tokens: FlattenedToken[],
  overrides: Overrides | undefined,
  warn?: (msg: string) => void,
): void {
  if (!overrides || overrides.length === 0) return;
  const tokenMap: TokenMap = new Map(
    tokens.map((token) => [token.path, token]),
  );

  overrides.forEach((rule, index) => {
    const overridePointer = segmentsToPointer(['$overrides', index]);
    if (typeof rule.$token !== 'string') {
      throw new Error(
        `Override ${overridePointer} is missing a $token pointer`,
      );
    }

    const targetPointer = canonicalizePointer(
      rule.$token,
      `Override ${overridePointer}`,
      '$token',
    );
    const target = tokenMap.get(targetPointer);
    if (!target) {
      throw new Error(
        `Override ${overridePointer} references unknown token ${targetPointer}`,
      );
    }

    const overrideRecord: TokenOverride = {
      source: overridePointer,
      when: { ...rule.$when },
    };

    if (typeof rule.$ref === 'string') {
      const refPointer = canonicalizePointer(
        rule.$ref,
        `Override ${overridePointer}`,
        '$ref',
      );
      const referenced = tokenMap.get(refPointer);
      if (!referenced) {
        throw new Error(
          `Override ${overridePointer} references unknown token ${refPointer}`,
        );
      }
      overrideRecord.ref = refPointer;
      overrideRecord.value = referenced.value;
      warnTypeMismatch(target, referenced, overridePointer, warn);
    }

    if (Object.prototype.hasOwnProperty.call(rule, '$value')) {
      overrideRecord.value = rule.$value;
    }

    if (rule.$fallback) {
      const fallbackCandidates = collectFallbackChain(
        rule.$fallback,
        target,
        ['$overrides', index, '$fallback'],
        tokenMap,
        warn,
      );
      if (fallbackCandidates.length > 0) {
        overrideRecord.fallback = fallbackCandidates;
      }
    }

    (target.overrides ??= []).push(overrideRecord);
  });
}
