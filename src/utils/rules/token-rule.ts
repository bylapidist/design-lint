import type {
  DtifFlattenedToken,
  RuleContext,
  RuleListener,
  RuleMeta,
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
  meta: RuleMeta;
  tokens: string | string[];
  /** Message to report when no allowed tokens are found. */
  message: string;
  getAllowed: (
    context: RuleContext<TOptions>,
    tokens: readonly DtifFlattenedToken[],
  ) => TAllowed;
  create: (context: RuleContext<TOptions>, allowed: TAllowed) => RuleListener;
  /** Determines whether the allowed set is effectively empty. */
  isEmpty?: (allowed: TAllowed) => boolean;
}

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
      const types = toArray(config.tokens);
      const dtifTokens = types.flatMap((t) => context.getDtifTokens(t));
      const allowed = config.getAllowed(context, dtifTokens);
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
