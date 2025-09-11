import type {
  FlattenedToken,
  RuleContext,
  RuleListener,
  RuleModule,
} from '../../core/types.js';
import { z } from 'zod';

interface TokenRuleConfig<TOptions, TAllowed> {
  name: string;
  meta: {
    description: string;
    category?: string;
    schema?: z.ZodType;
  };
  tokens: string | string[];
  message: string;
  getAllowed: (
    tokens: FlattenedToken[],
    context: RuleContext<TOptions>,
  ) => TAllowed;
  create: (context: RuleContext<TOptions>, allowed: TAllowed) => RuleListener;
  isEmpty?: (allowed: TAllowed) => boolean;
}

function hasSize(value: unknown): value is { size: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'size') === 'number'
  );
}

export function tokenRule<TOptions = unknown, TAllowed = Set<unknown>>(
  config: TokenRuleConfig<TOptions, TAllowed>,
): RuleModule<TOptions> {
  return {
    name: config.name,
    meta: { ...config.meta, schema: config.meta.schema ?? z.void() },
    create(context) {
      const types = Array.isArray(config.tokens)
        ? config.tokens
        : [config.tokens];
      const tokens = types.flatMap((t) => context.getFlattenedTokens(t));
      const allowed = config.getAllowed(tokens, context);
      const empty = config.isEmpty
        ? config.isEmpty(allowed)
        : hasSize(allowed) && allowed.size === 0;
      if (empty) {
        context.report({
          message: config.message,
          line: 1,
          column: 1,
        });
        return {};
      }
      return config.create(context, allowed);
    },
  };
}

export type { TokenRuleConfig };
