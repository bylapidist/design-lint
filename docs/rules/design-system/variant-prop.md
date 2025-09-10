---
title: design-system/variant-prop
description: 'Validate variant prop values against allowed tokens.'
---

# design-system/variant-prop

## Summary

Ensures that specified components use only allowed values for their variant prop. Works with React, Vue, Svelte, and Web Components.

## Configuration

Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/variant-prop": [
      "error",
      { "components": { "Button": ["primary", "secondary"] } }
    ]
  }
}
```

## Options

- `components` (`Record<string, string[]>`): map of component names to their allowed variant values.
- `prop` (`string`, default: `"variant"`): prop name to validate.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
<Button variant="danger" />
```

### Valid

```tsx
<Button variant="primary" />
```

### Custom Prop Name

```json
{
  "rules": {
    "design-system/variant-prop": [
      "error",
      { "prop": "tone", "components": { "Alert": ["info", "error"] } }
    ]
  }
}
```

```tsx
<Alert tone="info" />
```

## When Not To Use

If components freely accept any variant values, disable this rule.

## Related Rules

- [design-system/component-usage](./component-usage.md)
- [design-system/component-prefix](./component-prefix.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
