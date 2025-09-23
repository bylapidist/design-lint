/**
 * @packageDocumentation
 *
 * Zod schemas describing the structure of configuration and design tokens.
 */
import path from 'node:path';
import { z } from 'zod';
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { guards } from '../utils/index.js';

/**
 * Validation schema for configuration files.
 *
 * Uses [Zod](https://zod.dev/) to ensure user-supplied configuration matches
 * expected shapes and that token definitions are provided as DTIF design token
 * documents.
 */

const {
  data: { isRecord },
  domain: { isDesignTokens, isThemeRecord },
} = guards;

function isInlineDesignTokens(value: unknown): value is DesignTokens {
  if (isRecord(value) && typeof value.$version === 'string') {
    return true;
  }
  if (isThemeRecord(value)) {
    return false;
  }
  if (!isDesignTokens(value)) {
    return false;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (!isRecord(child)) {
      return false;
    }
  }
  return true;
}

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
 * Schema ensuring a value represents a DTIF design token document.
 */
const designTokensSchema = z.custom<DesignTokens>(isInlineDesignTokens, {
  message: 'Tokens must be DTIF design token objects',
});

/**
 * Schema validating token file path references.
 */
const tokenFileSchema = z
  .string()
  .refine(
    (p) =>
      !path.isAbsolute(p) &&
      (p.endsWith('.tokens') ||
        p.endsWith('.tokens.json') ||
        p.endsWith('.tokens.yaml') ||
        p.endsWith('.tokens.yml')),
    {
      message:
        'Token file paths must be relative and end with .tokens, .tokens.json, .tokens.yaml, or .tokens.yml',
    },
  );

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
