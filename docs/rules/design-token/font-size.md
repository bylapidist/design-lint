---
title: design-token/font-size
description: "Use font size tokens."
---

# design-token/font-size

## Summary
Ensures `font-size` declarations use values loaded from the DSR kernel.

Values are normalised to pixel equivalents before comparison (`rem × 16`, `px × 1`), so `1rem` and `16px` match the same token value.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/font-size": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `fontSizes` group:

```json
{
  "$version": "1.0.0",
  "fontSizes": {
    "base": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 1, "unit": "rem" }
    },
    "lg": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 1.25, "unit": "rem" }
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

Given tokens `base = 1rem (16px)` and `lg = 1.25rem (20px)`:

### Invalid

```css
/* 18px does not match any token */
.title { font-size: 18px; }
```

### Valid

```css
/* matches base token (1rem = 16px) */
.title { font-size: 1rem; }
.title { font-size: 16px; }
/* matches lg token (1.25rem = 20px) */
.title { font-size: 1.25rem; }
.title { font-size: 20px; }
```

## When Not To Use
If font sizes are not managed via tokens, disable this rule.

## Related Rules
- [design-token/font-family](./font-family.md)
- [design-token/line-height](./line-height.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
