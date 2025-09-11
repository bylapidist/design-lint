import type { RuleModule } from '../../core/types.js';
import { isRecord } from '../../utils/type-guards.js';

export interface IsRuleModuleOptions {
  requireMeta?: boolean;
  requireNonEmptyName?: boolean;
}

export function isRuleModule(
  value: unknown,
  options: IsRuleModuleOptions = {},
): value is RuleModule {
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
}
