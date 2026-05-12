---
title: design-token/opacity
description: "Use opacity tokens."
---

# design-token/opacity

## Summary
Enforces `opacity` values to match the opacity tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/opacity": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `number`-type tokens under an `opacity` group:

```json
{
  "$version": "1.0.0",
  "opacity": {
    "low": { "$type": "number", "$value": 0.2 },
    "high": { "$type": "number", "$ref": "#/opacity/low" }
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
.box { opacity: 0.5; }
```

### Valid

```css
.box { opacity: 0.2; }
```

## When Not To Use
If opacity values are not standardized, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/duration](./duration.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
