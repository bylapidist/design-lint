---
title: design-token/font-size
description: "Use font size tokens."
---

# design-token/font-size

## Summary
Ensures `font-size` declarations use values loaded from the DSR kernel.

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
    "lg": { "$type": "dimension", "$ref": "#/fontSizes/base" }
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
.title { font-size: 18px; }
```

### Valid

```css
.title { font-size: 1rem; }
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
