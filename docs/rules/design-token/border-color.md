---
title: design-token/border-color
description: "Enforce use of border color tokens."
---

# design-token/border-color

## Summary
Enforces `border-color` values to match the border color tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/border-color": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `color`-type tokens under a `borderColors` group:

```json
{
  "$version": "1.0.0",
  "borderColors": {
    "primary": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [1, 1, 1] }
    },
    "secondary": { "$type": "color", "$ref": "#/borderColors/primary" }
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
