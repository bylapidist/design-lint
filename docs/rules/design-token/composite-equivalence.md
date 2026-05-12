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
    "focus": { "$type": "border", "$value": "2px solid #000" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is auto-fixable (replaces matched raw values with a `var()` reference where possible).

## Examples

### Invalid

```css
/* matches a composite token exactly */
.card { border: 2px solid #000; }
```

### Valid

```css
/* uses a token reference */
.card { border: var(--border-focus); }
```

## When Not To Use
If your project does not use composite tokens, disable this rule.

## Related Rules
- [design-token/box-shadow](./box-shadow.md)
- [design-token/border-color](./border-color.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
