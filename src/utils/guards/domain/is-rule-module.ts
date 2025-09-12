import type { RuleModule } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Options for {@link isRuleModule}.
 */
export interface IsRuleModuleOptions {
  /**
   * Whether `meta` information must be present and non-empty.
   */
  requireMeta?: boolean;
  /**
   * Whether the `name` must be a non-empty string.
   */
  requireNonEmptyName?: boolean;
}

/**
 * Determines if an unknown value conforms to the {@link RuleModule} shape.
 *
 * @param value - The value to check.
 * @param options - Validation requirements.
 * @returns `true` if the value is a `RuleModule`.
 *
 * @example
 * isRuleModule({ name: 'demo', create: () => ({}) }); // => true
 */
export const isRuleModule = (
  value: unknown,
  options: IsRuleModuleOptions = {},
): value is RuleModule => {
  // The value must be an object before further inspection.
  if (!isRecord(value)) return false;

  // Normalize option defaults for the subsequent checks.
  const { requireMeta = false, requireNonEmptyName = false } = options;

  // Ensure a `name` string is present.
  if (typeof value.name !== 'string') return false;
  if (requireNonEmptyName && value.name.trim() === '') return false;

  // Ensure a `create` function exists to produce the rule implementation.
  if (typeof value.create !== 'function') return false;

  if (requireMeta) {
    // When metadata is required, it must contain a non-empty description.
    if (
      !isRecord(value.meta) ||
      typeof value.meta.description !== 'string' ||
      value.meta.description.trim() === ''
    ) {
      return false;
    }
  }
  return true;
};
