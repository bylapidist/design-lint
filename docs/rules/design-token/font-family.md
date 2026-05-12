---
title: design-token/font-family
description: "Use font family tokens in typography."
---

# design-token/font-family

## Summary
Ensures `font-family` declarations use values loaded from the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/font-family": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `fontFamily`-type tokens under a `fonts` group:

```json
{
  "$version": "1.0.0",
  "fonts": {
    "sans": {
      "$type": "fontFamily",
      "$value": ["Inter", "Arial", "sans-serif"]
    },
    "alt": { "$type": "fontFamily", "$ref": "#/fonts/sans" }
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
.title { font-family: 'Arial'; }
```

### Valid

```css
.title { font-family: "Inter, sans-serif"; }
```

## When Not To Use
If arbitrary font families are allowed, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/font-weight](./font-weight.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
