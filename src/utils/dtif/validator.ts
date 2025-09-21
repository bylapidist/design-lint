import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { ErrorObject } from 'ajv';
import type {
  CreateDtifValidatorOptions,
  DtifValidationResult,
  DtifValidator,
} from '@lapidist/dtif-validator';

type DtifSchema = typeof import('@lapidist/dtif-schema/core.json');

const require = createRequire(import.meta.url);
const VALIDATOR_ENTRY_PATH = require.resolve('@lapidist/dtif-validator');
const JSON_ASSERTION_SNIPPET = "assert { type: 'json' }";
const JSON_WITH_SNIPPET = "with { type: 'json' }";

function isJsonAssertionSyntaxError(error: unknown): error is SyntaxError {
  return (
    error instanceof SyntaxError &&
    typeof error.message === 'string' &&
    error.message.includes("Unexpected identifier 'assert'")
  );
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

interface DtifValidatorModule {
  createDtifValidator: (options?: CreateDtifValidatorOptions) => DtifValidator;
  validateDtif: (
    document: unknown,
    options?: CreateDtifValidatorOptions,
  ) => DtifValidationResult;
  schema: DtifSchema;
}

function isDtifValidatorModule(value: unknown): value is DtifValidatorModule {
  if (!isRecord(value)) return false;
  return (
    typeof value.createDtifValidator === 'function' &&
    typeof value.validateDtif === 'function' &&
    'schema' in value
  );
}

function ensurePatchedValidatorEntry(): void {
  const source = readFileSync(VALIDATOR_ENTRY_PATH, 'utf8');
  if (!source.includes(JSON_ASSERTION_SNIPPET)) {
    return;
  }
  const patched = source.replace(JSON_ASSERTION_SNIPPET, JSON_WITH_SNIPPET);
  writeFileSync(VALIDATOR_ENTRY_PATH, patched, 'utf8');
}

async function importDtifValidatorModule(): Promise<DtifValidatorModule> {
  ensurePatchedValidatorEntry();
  try {
    const moduleResult: unknown = await import('@lapidist/dtif-validator');
    if (!isDtifValidatorModule(moduleResult)) {
      throw new Error('DTIF validator module exports are incompatible');
    }
    return moduleResult;
  } catch (error) {
    if (isJsonAssertionSyntaxError(error)) {
      const moduleResult: unknown = await import(
        pathToFileURL(VALIDATOR_ENTRY_PATH).href
      );
      if (!isDtifValidatorModule(moduleResult)) {
        throw new Error(
          'Patched DTIF validator module exports are incompatible',
        );
      }
      return moduleResult;
    }
    throw error;
  }
}

const dtifModule = await importDtifValidatorModule();
const { createDtifValidator, validateDtif, schema } = dtifModule;

export const DTIF_VALIDATION_MESSAGE = 'Tokens must be valid DTIF documents';

export function formatDtifErrors(
  errors: ErrorObject[] | null | undefined,
): string {
  if (!errors || errors.length === 0) {
    return DTIF_VALIDATION_MESSAGE;
  }
  return errors
    .map((error) => {
      const path =
        error.instancePath && error.instancePath !== ''
          ? error.instancePath
          : '/';
      const message = error.message ?? 'is invalid';
      return `${path} ${message}`.trim();
    })
    .join('\n');
}

export { createDtifValidator, validateDtif, schema };
export type { CreateDtifValidatorOptions, DtifValidationResult, DtifValidator };
