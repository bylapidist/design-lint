function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasDtifIndicators(value: unknown): boolean {
  if (!value) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasDtifIndicators);
  }
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.$ref === 'string') {
    return true;
  }
  if ('$value' in value) {
    const raw = value.$value;
    if (isRecord(raw) && typeof raw.$ref === 'string') {
      return true;
    }
    if (
      isRecord(raw) &&
      ((typeof raw.dimensionType === 'string' && 'value' in raw) ||
        (typeof raw.durationType === 'string' && 'value' in raw))
    ) {
      return true;
    }
    if (isRecord(raw) && typeof raw.colorSpace === 'string') {
      const { components } = raw;
      if (Array.isArray(components) || isRecord(components)) {
        return true;
      }
    }
    if (hasDtifIndicators(raw)) {
      return true;
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    if (hasDtifIndicators(child)) {
      return true;
    }
  }
  return false;
}

export function isLikelyDtifDesignTokens(
  tokens: Record<string, unknown>,
): boolean {
  if (!isRecord(tokens)) {
    return false;
  }
  if ('$version' in tokens || '$overrides' in tokens || '' in tokens) {
    return true;
  }
  return Object.entries(tokens).some(([key, child]) => {
    if (key.startsWith('$')) {
      return false;
    }
    return hasDtifIndicators(child);
  });
}
