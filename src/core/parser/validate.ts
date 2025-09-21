import type { FlattenedToken } from '../types.js';
import type { ValidationTokenInfo } from '../token-validators/index.js';
import { validatorRegistry } from '../token-validators/index.js';
import { guards } from '../../utils/index.js';
import {
  describeTokenValueLocation,
  forEachTokenValue,
} from './token-values.js';

const {
  data: { isRecord },
} = guards;

function validateExtensions(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`Token or group ${path} has invalid $extensions`);
  }
}

function validateDeprecated(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value === 'boolean') return;
  if (isRecord(value)) {
    const replacement = Reflect.get(value, '$replacement');
    if (replacement === undefined || typeof replacement === 'string') return;
  }
  throw new Error(`Token or group ${path} has invalid $deprecated`);
}

// The spec says, "The value of the `$description` property MUST be a plain JSON string."
function validateDescription(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    throw new Error(`Token or group ${path} has invalid $description`);
  }
}

function validateMetadata(
  metadata: FlattenedToken['metadata'],
  path: string,
): void {
  validateExtensions(metadata.extensions, path);
  validateDeprecated(metadata.deprecated, path);
  validateDescription(metadata.description, path);
}

function validateToken(
  token: FlattenedToken,
  tokenMap: Map<string, ValidationTokenInfo>,
): void {
  validateMetadata(token.metadata, token.path);
  const hasValue = token.value !== undefined;
  const hasRef = token.ref !== undefined;
  if (!hasValue && !hasRef) {
    throw new Error(`Token ${token.path} must provide $value or $ref`);
  }
  if (!hasValue) {
    return;
  }
  if (!token.type) {
    throw new Error(`Token ${token.path} is missing $type`);
  }
  const validator = validatorRegistry.get(token.type);
  if (!validator) {
    throw new Error(`Token ${token.path} has unknown $type ${token.type}`);
  }
  forEachTokenValue(token, (candidate, index) => {
    const location = describeTokenValueLocation(token, index);
    validator(candidate, location, tokenMap);
  });
}

export function validateTokens(tokens: FlattenedToken[]): void {
  const tokenMap = new Map<string, ValidationTokenInfo>(
    tokens.map((t) => [
      t.path,
      {
        $value: t.value,
        ...(t.type ? { $type: t.type } : {}),
      },
    ]),
  );
  for (const t of tokens) {
    validateToken(t, tokenMap);
  }
}
