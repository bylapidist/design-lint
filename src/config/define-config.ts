/**
 * @packageDocumentation
 *
 * Helper for defining configuration objects with full TypeScript support.
 */
import type { Config } from '../core/linter.js';

// ---------------------------------------------------------------------------
// Rule ID union — one entry per built-in rule, enabling IDE autocomplete.
// ---------------------------------------------------------------------------

/**
 * Union of all built-in design-lint rule IDs.
 *
 * Use this type to get compile-time autocompletion when writing rule
 * configurations, or to constrain the `rules` key of a custom config type.
 *
 * @example
 * ```ts
 * import type { BuiltInRuleId } from '@lapidist/design-lint';
 * const ruleId: BuiltInRuleId = 'design-token/colors'; // ✓
 * ```
 */
export type BuiltInRuleId =
  // design-token/* rules
  | 'design-token/animation'
  | 'design-token/blur'
  | 'design-token/border-color'
  | 'design-token/border-radius'
  | 'design-token/border-width'
  | 'design-token/box-shadow'
  | 'design-token/colors'
  | 'design-token/composite-equivalence'
  | 'design-token/css-var-provenance'
  | 'design-token/duration'
  | 'design-token/easing'
  | 'design-token/font-family'
  | 'design-token/font-size'
  | 'design-token/font-weight'
  | 'design-token/letter-spacing'
  | 'design-token/line-height'
  | 'design-token/opacity'
  | 'design-token/outline'
  | 'design-token/spacing'
  | 'design-token/z-index'
  // design-system/* rules
  | 'design-system/component-prefix'
  | 'design-system/component-usage'
  | 'design-system/deprecation'
  | 'design-system/icon-usage'
  | 'design-system/import-path'
  | 'design-system/jsx-style-values'
  | 'design-system/no-hardcoded-spacing'
  | 'design-system/no-inline-styles'
  | 'design-system/no-unused-tokens'
  | 'design-system/variant-prop';

// ---------------------------------------------------------------------------
// Rule severity and config entry types
// ---------------------------------------------------------------------------

/**
 * Valid severity values for a rule, matching both string and numeric forms.
 */
export type RuleSeverity = 'off' | 'warn' | 'error' | 0 | 1 | 2;

/**
 * A rule configuration entry: either a bare severity or a tuple of
 * `[severity, ...options]`.
 *
 * @example
 * ```ts
 * 'error'                              // bare severity
 * ['warn', { allow: ['#fff'] }]        // severity + options
 * ```
 */
export type RuleEntry = RuleSeverity | [RuleSeverity, ...unknown[]];

// ---------------------------------------------------------------------------
// Typed config
// ---------------------------------------------------------------------------

/**
 * A strongly-typed design-lint configuration object.
 *
 * Identical to {@link Config} except the `rules` field constrains keys to
 * known {@link BuiltInRuleId} values (with autocomplete) while still
 * accepting arbitrary plugin rule IDs.
 *
 * Use {@link defineConfig} to create a `TypedConfig` with runtime passthrough.
 */
export interface TypedConfig extends Omit<Config, 'rules'> {
  /**
   * Rule configurations.
   *
   * Built-in rule IDs are enumerated for autocomplete; plugin rule IDs are
   * accepted via the `string` index signature fallback.
   */
  rules?: Partial<Record<BuiltInRuleId, RuleEntry>> & Record<string, RuleEntry>;
}

// ---------------------------------------------------------------------------
// defineConfig
// ---------------------------------------------------------------------------

/**
 * Defines a type-safe configuration object with IDE autocomplete for
 * built-in rule IDs and severity values.
 *
 * Accepts an optional generic `TConfig` that must extend {@link TypedConfig},
 * so the return type preserves the exact config shape passed in — enabling
 * const literal inference for rule maps without requiring `as const`.
 *
 * At runtime this is a no-op passthrough.
 *
 * @param config - Configuration object.
 * @returns The provided configuration unchanged.
 *
 * @example
 * ```ts
 * // designlint.config.ts
 * import { defineConfig } from '@lapidist/design-lint';
 *
 * export default defineConfig({
 *   rules: {
 *     'design-token/colors': 'error',       // ← autocomplete on the key
 *     'design-token/font-size': 'warn',
 *     'my-plugin/custom-rule': ['error', { allow: [] }],
 *   },
 * });
 * ```
 */
export function defineConfig<TConfig extends TypedConfig>(
  config: TConfig,
): TConfig {
  return config;
}
