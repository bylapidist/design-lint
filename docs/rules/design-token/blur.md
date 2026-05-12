---
title: design-token/blur
description: "Ensure blur values use blur tokens."
---

# design-token/blur

## Summary
Enforces `blur()` values in `filter` or `backdrop-filter` to match the blur tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/blur": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `blurs` group:

```json
{
  "$version": "1.0.0",
  "blurs": {
    "md": { "$type": "dimension", "$ref": "#/blurs/sm" },
    "sm": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 4, "unit": "px" }
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
- `units` (`string[]`): CSS length units to validate for `blur(...)` arguments. Defaults to `['px', 'rem', 'em']`.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { filter: blur(2px); }
```

### Valid

```css
.box { filter: blur(4px); }
```

## When Not To Use
If enforcing blur tokens is unnecessary, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/spacing](./spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
