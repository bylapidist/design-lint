---
title: design-token/line-height
description: "Use line height tokens."
---

# design-token/line-height

## Summary
Enforces `line-height` values to match the line-height tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/line-height": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `number`-type tokens under a `lineHeights` group:

```json
{
  "$version": "1.0.0",
  "lineHeights": {
    "base": { "$type": "number", "$value": 1.5 },
    "tight": { "$type": "number", "$ref": "#/lineHeights/base" }
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
.text { line-height: 2; }
```

### Valid

```css
.text { line-height: 1.5; }
.text { line-height: 20px; }
```

## When Not To Use
If line heights are not standardized, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/letter-spacing](./letter-spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
