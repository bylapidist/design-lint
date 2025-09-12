import type {
  FlattenedToken,
  RuleContext,
  RuleListener,
  RuleModule,
} from '../../core/types.js';
import { z } from 'zod';
import { isObject } from '../guards/index.js';
import { toArray } from '../collections/index.js';

/**
 * Configuration for creating a token-based rule via {@link tokenRule}.
 *
 * @typeParam TOptions - Shape of the rule options.
 * @typeParam TAllowed - Structure representing the computed allowed values.
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
 *
 * @param value - The value to inspect.
 * @returns `true` if the value exposes a numeric `size` property.
 */
const hasSize = (value: unknown): value is { size: number } =>
  isObject(value) && typeof Reflect.get(value, 'size') === 'number';

/**
 * Simplifies writing rules that operate on design tokens by handling token
 * collection, allowed-value preparation, and empty-state reporting.
 *
 * @typeParam TOptions - Shape of the rule options.
 * @typeParam TAllowed - Structure representing the computed allowed values.
 *
 * @example
 * const myRule = tokenRule({
 *   name: 'example/no-red',
 *   meta: { description: 'disallow red tokens' },
 *   tokens: 'color',
 *   message: 'red tokens are not allowed',
 *   getAllowed: () => new Set(['blue']),
 *   create(ctx, allowed) {
 *     return {
 *       onToken(token) {
 *         if (!allowed.has(token.$value)) {
 *           ctx.report({ message: token.$value, line: 1, column: 1 });
 *         }
 *       },
 *     };
 *   },
 * });
 */
export function tokenRule<TOptions = unknown, TAllowed = Set<unknown>>(
  config: TokenRuleConfig<TOptions, TAllowed>,
): RuleModule<TOptions> {
  return {
    name: config.name,
    meta: { ...config.meta, schema: config.meta.schema ?? z.void() },
    create(context) {
      // Normalize `tokens` to an array so rule authors can supply either a
      // single token type or multiple types.
      const types = toArray(config.tokens);

      // Retrieve and flatten the available tokens for each requested type.
      const tokens = types.flatMap((t) => context.getFlattenedTokens(t));

      // Compute the set of allowed values using the rule's callback.
      const allowed = config.getAllowed(tokens, context);

      // Determine whether the allowed set is effectively empty, either via a
      // custom `isEmpty` check or by inspecting a `size` property when present.
      const empty = config.isEmpty
        ? config.isEmpty(allowed)
        : hasSize(allowed) && allowed.size === 0;
      if (empty) {
        // Report an informative message and exit early when no allowed tokens
        // exist to lint against.
        context.report({
          message: config.message,
          line: 1,
          column: 1,
        });
        return {};
      }

      // Delegate to the rule-specific factory with the prepared allowed set.
      return config.create(context, allowed);
    },
  };
}

export type { TokenRuleConfig };
