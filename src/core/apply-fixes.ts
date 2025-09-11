import type { LintMessage, Fix } from './types';

export function applyFixes(text: string, messages: LintMessage[]): string {
  const fixes: Fix[] = messages
    .filter((m): m is LintMessage & { fix: Fix } => m.fix !== undefined)
    .map((m) => m.fix);
  if (fixes.length === 0) return text;
  fixes.sort((a, b) => a.range[0] - b.range[0]);
  const filtered: Fix[] = [];
  let lastEnd = -1;
  for (const f of fixes) {
    if (f.range[0] < lastEnd) continue;
    filtered.push(f);
    lastEnd = f.range[1];
  }
  for (let i = filtered.length - 1; i >= 0; i--) {
    const f = filtered[i];
    text = text.slice(0, f.range[0]) + f.text + text.slice(f.range[1]);
  }
  return text;
}
