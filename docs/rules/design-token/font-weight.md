---
title: design-token/font-weight
description: "Use font weight tokens."
---

# design-token/font-weight

## Summary
Enforces `font-weight` values in CSS and numeric literals in TypeScript inline style objects to match the font weight tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/font-weight": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `fontWeight`-type tokens under a `fontWeights` group:

```json
{
  "$version": "1.0.0",
  "fontWeights": {
    "bold": { "$type": "fontWeight", "$value": 700 },
    "emphasis": { "$type": "fontWeight", "$ref": "#/fontWeights/bold" },
    "regular": { "$type": "fontWeight", "$value": 400 }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

Font-weight tokens may be numbers (e.g. `400`) or keyword strings (e.g. `"bold"`). Numeric tokens are checked against CSS numeric values and TypeScript numeric literals. String tokens are checked against CSS keyword values.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

Given tokens `regular = 400` and `bold = 700` (numeric):

### Invalid

```css
/* 500 does not match any token */
.text { font-weight: 500; }
/* "bold" keyword is not in the token set (only numeric 400 and 700 are) */
.text { font-weight: bold; }
```

### Valid

```css
.text { font-weight: 400; }
.text { font-weight: 700; }
```

```tsx
/* TypeScript inline style — numeric literal */
<p style={{ fontWeight: 400 }} />
```

If you want to allow the `bold` keyword, add a string-valued token:

```json
{ "boldKeyword": { "$type": "fontWeight", "$value": "bold" } }
```

## When Not To Use
If arbitrary font weights are allowed, disable this rule.

## Related Rules
- [design-token/font-family](./font-family.md)
- [design-token/font-size](./font-size.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
