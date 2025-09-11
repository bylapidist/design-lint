import path from 'node:path';
import { z } from 'zod';
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { guards } from '../utils/index.js';

const { isRecord } = guards.data;

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

function isToken(value: unknown): boolean {
  return isRecord(value) && '$value' in value;
}

function isTokenGroup(value: unknown): boolean {
  if (!isRecord(value)) return false;
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    if (!isToken(val) && !isTokenGroup(val)) return false;
  }
  return true;
}

const designTokensSchema = z.custom<DesignTokens>(isTokenGroup, {
  message: 'Tokens must be W3C Design Tokens objects',
});

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

const tokensSchema = z.union([
  designTokensSchema,
  z.record(z.string(), z.union([designTokensSchema, tokenFileSchema])),
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
