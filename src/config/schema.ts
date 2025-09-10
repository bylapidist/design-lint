import { z } from 'zod';
import type { Config } from '../core/linter.js';
import type { DesignTokens, LegacyDesignTokens } from '../core/types.js';

const severitySchema = z.union([
  z.literal('error'),
  z.literal('warn'),
  z.literal('off'),
  z.literal(2),
  z.literal(1),
  z.literal(0),
]);

const ruleSettingSchema = z.union([
  severitySchema,
  z.tuple([severitySchema, z.unknown()]),
]);

const designTokensSchema = z.record(
  z.string(),
  z.unknown(),
) as unknown as z.ZodType<DesignTokens>;

const tokensSchema: z.ZodType<
  | DesignTokens
  | Record<string, DesignTokens | string>
  | LegacyDesignTokens
  | Record<string, LegacyDesignTokens | string>
> = z.union([
  designTokensSchema,
  z.record(z.string(), z.union([designTokensSchema, z.string()])),
]);

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
  })
  .strict();

export type ConfigWithSchema = z.infer<typeof configSchema>;
