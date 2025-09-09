---
title: design-system/component-usage
description: "Replace raw HTML elements with design system components."
---

# design-system/component-usage

## Summary
Disallows raw HTML elements when a design system component should be used instead.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/component-usage": [
      "error",
      { "substitutions": { "button": "DSButton" } }
    ]
  }
}
```

## Options
- `substitutions` (`Record<string, string>`): map of disallowed HTML tags to their design system components. Tag names are matched case-insensitively.

*This rule is auto-fixable.*

## Examples

### Invalid

```tsx
<button>Save</button>
```

### Valid

```tsx
<DSButton>Save</DSButton>
```

## When Not To Use
If you allow raw HTML elements or lack a component library, disable this rule.

## Related Rules
- [design-system/component-prefix](./component-prefix.md)
- [design-system/import-path](./import-path.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
