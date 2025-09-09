---
title: design-system/icon-usage
description: "Ensure icons come from the design system library."
---

# design-system/icon-usage

## Summary
Reports raw `<svg>` elements or non-design system icon components.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/icon-usage": [
      "error",
      { "substitutions": { "svg": "Icon", "FooIcon": "Icon" } }
    ]
  }
}
```

## Options
- `substitutions` (`Record<string, string>`): map of disallowed icon element or component names to their design system replacements. Keys are matched case-insensitively. Defaults to `{ "svg": "Icon" }`.

*This rule is auto-fixable.*

## Examples

### Invalid

```tsx
<svg />
<FooIcon />
```

### Valid

```tsx
<Icon />
```

## When Not To Use
If raw SVGs or third-party icons are acceptable in your project, disable this rule.

## Related Rules
- [design-system/component-usage](./component-usage.md)
- [design-system/variant-prop](./variant-prop.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
