---
title: design-token/css-var-provenance
description: "Disallow CSS variable references not backed by a DTIF token."
---

# design-token/css-var-provenance

## Summary
Reports `var(--...)` references in CSS declarations that are not backed by a token in the DSR kernel. Prevents "ghost" variables — CSS custom properties used in code but not registered in the design system — from drifting undetected.

The rule derives expected CSS variable names from token pointers (e.g., `#/color/button/background` → `--color-button-background`). Any `var()` reference that does not match a known token pointer is flagged.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/css-var-provenance": "error" } }
```

Seed the DSR kernel with your full token catalog so all known variables are registered:

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
/* --color-accent is not a registered token */
.btn { color: var(--color-accent); }
```

### Valid

```css
/* --color-button-background corresponds to #/color/button/background */
.btn { color: var(--color-button-background); }
```

## When Not To Use
If your project uses CSS variables from third-party libraries or frameworks that are not part of your DTIF token catalog, disable or configure this rule carefully to avoid noise.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/composite-equivalence](./composite-equivalence.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
