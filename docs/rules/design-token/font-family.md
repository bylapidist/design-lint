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

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `fontFamily`-type tokens under a `fonts` group. Token values must be strings — each string represents an individual font family name:

```json
{
  "$version": "1.0.0",
  "fonts": {
    "sans": { "$type": "fontFamily", "$value": "Inter" },
    "mono": { "$type": "fontFamily", "$value": "JetBrains Mono" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

The rule splits CSS `font-family` values by comma and checks each individual family name against the token set. The first family name that does not match a token is reported; remaining families are not checked.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

Given tokens `fonts.sans = "Inter"` and `fonts.mono = "JetBrains Mono"`:

### Invalid

```css
/* Arial is not a registered font token */
.title { font-family: Arial, sans-serif; }
/* Inter is valid but Arial is not */
.title { font-family: Inter, Arial; }
```

### Valid

```css
/* all families match tokens */
.title { font-family: Inter; }
.code { font-family: JetBrains Mono; }
```

## When Not To Use
If arbitrary font families are allowed, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/font-weight](./font-weight.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
