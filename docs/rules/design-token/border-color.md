---
title: design-token/border-color
description: "Enforce use of border color tokens."
---

# design-token/border-color

## Summary
Enforces `border-color`, `border-top-color`, `border-right-color`, `border-bottom-color`, and `border-left-color` values to match any `color`-type token loaded into the DSR kernel.

The rule draws from the same color token pool as `design-token/colors`. No special grouping is required — any `$type: "color"` token in your DTIF catalog is eligible.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/border-color": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `color`-type tokens:

```json
{
  "$version": "1.0.0",
  "color": {
    "border": {
      "primary": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0, 0, 0] }
      }
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
.box { border-color: #000000; }
```

### Valid

```css
.box { border-color: #ffffff; }
```

## When Not To Use
If border colors aren't standardized through tokens, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/border-width](./border-width.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
