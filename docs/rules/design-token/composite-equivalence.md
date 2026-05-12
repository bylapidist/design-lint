---
title: design-token/composite-equivalence
description: "Disallow raw composite values that match an existing composite token."
---

# design-token/composite-equivalence

## Summary
Reports raw CSS composite values (borders, shadows, typography, transitions) that exactly match an existing composite token in the DSR kernel. Authors should reference the token instead of repeating its value literally.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/composite-equivalence": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes composite-type tokens (`boxShadow`, `border`, `typography`, `transition`):

```json
{
  "$version": "1.0.0",
  "borders": {
    "focus": {
      "$type": "border",
      "$value": {
        "borderType": "css.border",
        "color": { "colorSpace": "srgb", "components": [0, 0, 0] },
        "style": "solid",
        "width": { "dimensionType": "length", "value": 2, "unit": "px" }
      }
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is auto-fixable. Matched raw values are replaced with `var(--derived-name)` where the CSS variable name is derived from the token pointer (e.g. `#/borders/focus` → `var(--borders-focus)`).

## Examples

### Invalid

```css
/* raw composite value that could reference a token instead */
.card { border: 2px solid #000; }
```

### Valid

```css
/* uses a token reference derived from pointer #/borders/focus */
.card { border: var(--borders-focus); }
```

## When Not To Use
If your project does not use composite tokens, disable this rule.

## Related Rules
- [design-token/box-shadow](./box-shadow.md)
- [design-token/border-color](./border-color.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
