/**
 * @packageDocumentation
 *
 * Zod schemas describing the structure of configuration and design tokens.
 */
import path from 'node:path';
import {
  createDtifValidator,
  DTIF_VALIDATION_MESSAGE,
  formatDtifErrors,
} from '../utils/dtif/validator.js';
import {
  isSupportedTokenFilePath,
  TOKEN_FILE_SUFFIXES,
} from '../utils/tokens/files.js';
import { z } from 'zod';
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';

/**
 * Validation schema for configuration files.
 *
 * Uses [Zod](https://zod.dev/) to ensure user-supplied configuration matches
 * expected shapes and that token definitions adhere to the Design Token
 * Interchange Format (DTIF).
 */

const dtifValidator = createDtifValidator();
/**
 * Allowed rule severity values like `'error'` or numeric levels.
 */
const severitySchema = z.union([
  z.literal('error'),
  z.literal('warn'),
  z.literal('off'),
  z.literal(2),
  z.literal(1),
  z.literal(0),
]);

/**
 * Schema describing the configuration of an individual rule.
 */
const ruleSettingSchema = z.union([
  severitySchema,
  z.tuple([severitySchema, z.unknown()]),
]);

/**
 * Schema ensuring a value follows the DTIF format.
 */
function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

const designTokensSchema: z.ZodType<DesignTokens> = z
  .unknown()
  .superRefine((value, ctx) => {
    if (!isObjectRecord(value) || Array.isArray(value)) {
      ctx.addIssue({
        code: 'custom',
        message: DTIF_VALIDATION_MESSAGE,
      });
      return;
    }

    if (!dtifValidator.validate(value)) {
      const details = formatDtifErrors(dtifValidator.validate.errors);
      const message =
        details === DTIF_VALIDATION_MESSAGE
          ? DTIF_VALIDATION_MESSAGE
          : `DTIF validation failed:\n${details}`;
      ctx.addIssue({
        code: 'custom',
        message,
      });
    }
  })
  .pipe(z.custom<DesignTokens>(() => true));

/**
 * Schema validating token file path references.
 */
const TOKEN_FILE_MESSAGE = `Token file paths must be relative and end with one of: ${TOKEN_FILE_SUFFIXES.join(', ')}`;

const tokenFileSchema = z
  .string()
  .refine((p) => !path.isAbsolute(p) && isSupportedTokenFilePath(p), {
    message: TOKEN_FILE_MESSAGE,
  });

/**
 * Schema describing the `tokens` property of configuration objects.
 */
const themeNameSchema = z.string().refine((n) => !n.startsWith('$'), {
  message: 'Theme names must not start with $',
});

const tokensSchema = z.union([
  designTokensSchema,
  z.record(themeNameSchema, z.union([designTokensSchema, tokenFileSchema])),
]);

const nameTransformSchema = z
  .enum(['kebab-case', 'camelCase', 'PascalCase'])
  .optional();

const outputTargetSchema = z
  .object({
    format: z.enum(['css', 'js', 'ts']),
    file: z.string(),
    nameTransform: nameTransformSchema,
    selectors: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/**
 * Zod schema describing a valid linter configuration.
 */
export const configSchema: z.ZodType<Config> = z
  .object({
    tokens: tokensSchema.optional(),
    rules: z.record(z.string(), ruleSettingSchema).optional(),
    ignoreFiles: z.array(z.string()).optional(),
    plugins: z.array(z.string()).optional(),
    configPath: z.string().optional(),
    concurrency: z.number().int().positive().optional(),
    patterns: z.array(z.string()).optional(),
    wrapTokensWithVar: z.boolean().optional(),
    nameTransform: nameTransformSchema,
    output: z.array(outputTargetSchema).optional(),
  })
  .strict();

/**
 * Type representing configuration validated by {@link configSchema}.
 */
export type ConfigWithSchema = z.infer<typeof configSchema>;
