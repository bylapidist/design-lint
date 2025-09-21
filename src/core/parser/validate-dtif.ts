import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DesignTokens } from '../types.js';

const require = createRequire(import.meta.url);

let validatorModulePromise:
  | Promise<typeof import('@lapidist/dtif-validator')>
  | undefined;

function hasOwnProperty<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isDtifValidatorModule(
  value: unknown,
): value is typeof import('@lapidist/dtif-validator') {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const createValidator: unknown = Reflect.get(value, 'createDtifValidator');
  return typeof createValidator === 'function';
}

function shouldValidateDtifDocument(tokens: DesignTokens): boolean {
  if (hasOwnProperty(tokens, '$version')) {
    return true;
  }
  if (hasOwnProperty(tokens, '$schema')) {
    const schemaRef = tokens.$schema;
    if (typeof schemaRef === 'string' && schemaRef.includes('dtif')) {
      return true;
    }
  }
  if (hasOwnProperty(tokens, '$overrides')) {
    return true;
  }
  // TODO: broaden DTIF detection once legacy DTCG documents are fully migrated.
  return false;
}

async function importDtifValidator(): Promise<
  typeof import('@lapidist/dtif-validator')
> {
  validatorModulePromise ??= (async () => {
    try {
      return await import('@lapidist/dtif-validator');
    } catch (error) {
      if (
        error instanceof Error &&
        typeof error.message === 'string' &&
        (error.message.includes("Unexpected identifier 'assert'") ||
          error.message.includes('deprecatedImportAssert'))
      ) {
        const originalPath = require.resolve('@lapidist/dtif-validator');
        const source = await fs.readFile(originalPath, 'utf8');
        const rewritten = source.replace(
          /assert\s*\{\s*type:\s*'json'\s*\}/g,
          "with { type: 'json' }",
        );
        const cacheDir = path.join(path.dirname(originalPath), '.cache');
        await fs.mkdir(cacheDir, { recursive: true });
        const cachePath = path.join(cacheDir, 'index.mjs');
        await fs.writeFile(cachePath, rewritten, 'utf8');
        const patchedModule: unknown = await import(
          pathToFileURL(cachePath).href
        );
        if (!isDtifValidatorModule(patchedModule)) {
          throw new Error('Failed to load DTIF validator');
        }
        return patchedModule;
      }
      throw error;
    }
  })();
  return validatorModulePromise;
}

const { createDtifValidator } = await importDtifValidator();
const dtifValidator = createDtifValidator();

function toPointer(error: unknown): string {
  const instancePath: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'instancePath')
      : undefined;
  if (typeof instancePath === 'string' && instancePath.length > 0) {
    return `#${instancePath}`;
  }
  const dataPath: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'dataPath')
      : undefined;
  if (typeof dataPath === 'string' && dataPath.length > 0) {
    if (dataPath.startsWith('#')) {
      return dataPath;
    }
    if (dataPath.startsWith('.')) {
      return `#${dataPath}`;
    }
    return `#/${dataPath}`;
  }
  return '#';
}

function formatError(error: unknown): string {
  const pointer = toPointer(error);
  const keyword: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'keyword')
      : undefined;
  const params: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'params')
      : undefined;
  if (keyword === 'required' && typeof params === 'object' && params !== null) {
    const missingProperty: unknown = Reflect.get(params, 'missingProperty');
    if (typeof missingProperty === 'string') {
      return `${pointer} must have required property '${missingProperty}'`;
    }
  }
  if (
    keyword === 'additionalProperties' &&
    typeof params === 'object' &&
    params !== null
  ) {
    const additionalProperty: unknown = Reflect.get(
      params,
      'additionalProperty',
    );
    if (typeof additionalProperty === 'string') {
      return `${pointer} must NOT have additional property '${additionalProperty}'`;
    }
  }
  if (
    keyword === 'unevaluatedProperties' &&
    typeof params === 'object' &&
    params !== null
  ) {
    const unevaluatedProperty: unknown = Reflect.get(
      params,
      'unevaluatedProperty',
    );
    if (typeof unevaluatedProperty === 'string') {
      return `${pointer} must NOT have additional property '${unevaluatedProperty}'`;
    }
  }
  const message: unknown =
    typeof error === 'object' && error !== null
      ? Reflect.get(error, 'message')
      : undefined;
  return `${pointer} ${typeof message === 'string' ? message : 'is invalid'}`;
}

export function validateDesignTokensDocument(tokens: DesignTokens): void {
  if (!shouldValidateDtifDocument(tokens)) {
    return;
  }
  const valid = dtifValidator.validate(tokens);
  if (valid) {
    return;
  }
  const errors = dtifValidator.validate.errors ?? [];
  const details = errors.map((error) => `- ${formatError(error)}`).join('\n');
  throw new Error(`DTIF validation failed:\n${details}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneTokens<T>(value: T): T {
  if (typeof globalThis.structuredClone !== 'function') {
    throw new Error('structuredClone is not available in this environment');
  }
  return globalThis.structuredClone(value);
}

function canonicalizeToken(
  token: Record<string, unknown>,
  inheritedType?: string,
): void {
  if (token.$type === undefined && inheritedType !== undefined) {
    token.$type = inheritedType;
  }
}

function canonicalizeCollection(
  node: Record<string, unknown>,
  inheritedType?: string,
): void {
  const ownType = typeof node.$type === 'string' ? node.$type : undefined;
  if (ownType !== undefined && !('$value' in node) && !('$ref' in node)) {
    delete node.$type;
  }
  const nextType = ownType ?? inheritedType;

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (!isRecord(value)) {
      continue;
    }
    const hasTokenFields = '$value' in value || '$ref' in value;
    const childKeys = Object.keys(value).filter(
      (childKey) => !childKey.startsWith('$'),
    );
    if (hasTokenFields || childKeys.length === 0) {
      canonicalizeToken(value, nextType);
    } else {
      canonicalizeCollection(value, nextType);
    }
  }
}

function canonicalizeTree<T extends Record<string, unknown>>(tokens: T): T {
  const clone = cloneTokens(tokens);
  canonicalizeCollection(clone);
  return clone;
}

export function canonicalizeDesignTokens(tokens: DesignTokens): DesignTokens {
  return canonicalizeTree(tokens);
}
