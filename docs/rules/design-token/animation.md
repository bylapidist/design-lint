---
title: design-token/animation
description: "Require animation values to reference defined tokens."
---

# design-token/animation

## Summary
Enforces `animation` values to match the animation tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/animation": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `string`-type tokens under an `animations` group:

```json
{
  "$version": "1.0.0",
  "animations": {
    "spin": { "$type": "string", "$value": "spin 1s linear infinite" },
    "wiggle": { "$type": "string", "$ref": "#/animations/spin" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is not auto-fixable.

Values containing `var(` (CSS variable references) are always allowed and not checked.

## Examples

### Invalid

```css
.box { animation: wiggle 2s ease-in-out; }
```

### Valid

```css
.box { animation: spin 1s linear infinite; }
```

## When Not To Use
If your project does not enforce animation tokens, disable this rule.

## Related Rules
- [design-token/duration](./duration.md)
- [design-token/colors](./colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
