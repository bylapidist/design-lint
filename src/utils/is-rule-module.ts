import type { RuleModule } from '../core/types';
import { isRecord } from './is-record';

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
 */
export const isRuleModule = (
  value: unknown,
  options: IsRuleModuleOptions = {},
): value is RuleModule => {
  if (!isRecord(value)) return false;
  const { requireMeta = false, requireNonEmptyName = false } = options;
  if (typeof value.name !== 'string') return false;
  if (requireNonEmptyName && value.name.trim() === '') return false;
  if (typeof value.create !== 'function') return false;
  if (requireMeta) {
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
