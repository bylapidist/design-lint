import { z } from 'zod';
import type { Config } from '../engine/linter.js';
import type { DesignTokens } from '../engine/types.js';

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

const numberOrString = z.union([z.number(), z.string()]);

const tokenPatternArray = z.array(z.union([z.string(), z.instanceof(RegExp)]));

const tokenGroup = <T extends z.ZodType>(
  schema: T,
): z.ZodType<Record<string, z.infer<T>> | (string | RegExp)[]> =>
  z.union([z.record(z.string(), schema), tokenPatternArray]);

const baseTokensSchema: z.ZodType<DesignTokens> = z
  .object({
    colors: tokenGroup(z.string()).optional(),
    spacing: tokenGroup(z.number()).optional(),
    zIndex: tokenGroup(z.number()).optional(),
    borderRadius: tokenGroup(numberOrString).optional(),
    borderWidths: tokenGroup(numberOrString).optional(),
    shadows: tokenGroup(z.string()).optional(),
    durations: tokenGroup(numberOrString).optional(),
    animations: tokenGroup(z.string()).optional(),
    blurs: tokenGroup(numberOrString).optional(),
    borderColors: tokenGroup(z.string()).optional(),
    opacity: tokenGroup(numberOrString).optional(),
    outlines: tokenGroup(z.string()).optional(),
    fontSizes: tokenGroup(numberOrString).optional(),
    fonts: tokenGroup(z.string()).optional(),
    lineHeights: tokenGroup(numberOrString).optional(),
    fontWeights: tokenGroup(numberOrString).optional(),
    letterSpacings: tokenGroup(numberOrString).optional(),
    deprecations: z
      .record(z.string(), z.object({ replacement: z.string().optional() }))
      .optional(),
  })
  .catchall(z.unknown());

const tokensSchema: z.ZodType<DesignTokens | Record<string, DesignTokens>> =
  z.union([baseTokensSchema, z.record(z.string(), baseTokensSchema)]);

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
