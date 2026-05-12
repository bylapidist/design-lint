---
title: design-token/outline
description: "Use outline tokens."
---

# design-token/outline

## Summary
Enforces `outline` values to match the outline tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/outline": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `string`-type tokens under an `outlines` group:

```json
{
  "$version": "1.0.0",
  "outlines": {
    "focus": { "$type": "string", "$value": "2px solid #000" },
    "active": { "$type": "string", "$ref": "#/outlines/focus" }
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
.box { outline: 3px solid #000; }
```

### Valid

```css
.box { outline: 2px solid #000; }
```

## When Not To Use
If outline styles are not tokenized, disable this rule.

## Related Rules
- [design-token/border-color](./border-color.md)
- [design-token/border-width](./border-width.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
