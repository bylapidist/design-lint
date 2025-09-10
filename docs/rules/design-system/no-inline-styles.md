---
title: design-system/no-inline-styles
description: 'Disallow inline style attributes in components.'
---

# design-system/no-inline-styles

## Summary

Disallows inline `style` and `className` (or `class`) attributes on design system components. Works with React, Vue, Svelte, and Web Components.

## Configuration

Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/no-inline-styles": ["error", { "ignoreClassName": false }]
  }
}
```

## Options

- `ignoreClassName` (`boolean`, default: `false`): if `true`, `className`/`class` attributes are ignored.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
<Button style={{ color: 'red' }} />
```

```tsx
<Button className="custom" />
```

### Valid

```tsx
<Button />
```

```tsx
<Button className="custom" />
// when ignoreClassName is true
```

## When Not To Use

If inline styles or custom class names are permitted, disable this rule.

## Related Rules

- [design-system/component-usage](./component-usage.md)
- [design-system/variant-prop](./variant-prop.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
