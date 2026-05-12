---
title: design-token/easing
description: "Disallow raw easing values — use cubicBezier tokens."
---

# design-token/easing

## Summary
Flags raw `cubic-bezier(...)`, `steps(...)`, `step-start`, and `step-end` timing function values in `animation-timing-function`, `transition-timing-function`, and `animation` declarations. Authors must use a `cubicBezier`-type token from the DSR kernel instead.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/easing": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `cubicBezier`-type tokens:

```json
{
  "$version": "1.0.0",
  "easing": {
    "standard": {
      "$type": "cubicBezier",
      "$value": "cubic-bezier(0.4, 0, 0.2, 1)"
    },
    "decelerate": {
      "$type": "cubicBezier",
      "$value": "cubic-bezier(0, 0, 0.2, 1)"
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.fade { transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1); }
```

### Valid

```css
/* raw value matches a cubicBezier token */
.fade { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

/* CSS variable reference */
.fade { transition-timing-function: var(--easing-standard); }
```

## When Not To Use
If easing values are not standardized with tokens, disable this rule.

## Related Rules
- [design-token/duration](./duration.md)
- [design-token/animation](./animation.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
