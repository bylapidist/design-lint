import type {
  FlattenedToken,
  RuleContext,
  RuleListener,
  RuleModule,
} from '../core/types.js';
import { z } from 'zod';
import { isObject } from './is-object.js';
import { toArray } from './collections/index.js';

/**
 * Configuration for creating a token-based rule via {@link tokenRule}.
 */
interface TokenRuleConfig<TOptions, TAllowed> {
  /** The rule name, e.g. `design-token/example`. */
  name: string;
  meta: {
    /** A human-readable description of the rule. */
    description: string;
    /** Optional rule category. */
    category?: string;
    /** Optional JSON schema for rule options. */
    schema?: z.ZodType;
  };
  /** Token type(s) the rule should operate on. */
  tokens: string | string[];
  /** Message to report when no allowed tokens are found. */
  message: string;
  /**
   * Computes the set of allowed values based on available tokens.
   */
  getAllowed: (
    tokens: FlattenedToken[],
    context: RuleContext<TOptions>,
  ) => TAllowed;
  /** Creates the actual rule listener using the allowed set. */
  create: (context: RuleContext<TOptions>, allowed: TAllowed) => RuleListener;
  /** Determines whether the allowed set is effectively empty. */
  isEmpty?: (allowed: TAllowed) => boolean;
}

/**
 * Determines whether a value has a numeric `size` property.
 */
const hasSize = (value: unknown): value is { size: number } =>
  isObject(value) && typeof Reflect.get(value, 'size') === 'number';

/**
 * Simplifies writing rules that operate on design tokens by handling token
 * collection, allowed-value preparation, and empty-state reporting.
 */
export function tokenRule<TOptions = unknown, TAllowed = Set<unknown>>(
  config: TokenRuleConfig<TOptions, TAllowed>,
): RuleModule<TOptions> {
  return {
    name: config.name,
    meta: { ...config.meta, schema: config.meta.schema ?? z.void() },
    create(context) {
      const types = toArray(config.tokens);
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
