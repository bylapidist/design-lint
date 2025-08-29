import { z } from 'zod';
import type { Config } from '../core/linter.js';

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

const tokensSchema = z
  .object({
    colors: z.record(z.string(), z.string()).optional(),
    spacing: z.record(z.string(), z.number()).optional(),
    zIndex: z.record(z.string(), z.number()).optional(),
    typography: z
      .object({
        fontSizes: z
          .record(z.string(), z.union([z.number(), z.string()]))
          .optional(),
        fonts: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    deprecations: z
      .record(z.string(), z.object({ replacement: z.string().optional() }))
      .optional(),
  })
  .catchall(z.unknown());

export const configSchema: z.ZodSchema<Config> = z
  .object({
    tokens: tokensSchema.optional(),
    rules: z.record(z.string(), ruleSettingSchema).optional(),
    ignoreFiles: z.array(z.string()).optional(),
    plugins: z.array(z.string()).optional(),
    configPath: z.string().optional(),
    concurrency: z.number().int().positive().optional(),
    patterns: z.array(z.string()).optional(),
  })
  .strict();

export type ConfigWithSchema = z.infer<typeof configSchema>;
