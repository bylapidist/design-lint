---
title: design-system/jsx-style-values
description: "Disallow raw values inside JSX inline style objects."
---

# design-system/jsx-style-values

## Summary
Flags hard-coded string and numeric literals inside JSX inline style objects (the object passed to the `style` prop). Values that are clearly token references (`var(--...)`) or zero are allowed. This rule is particularly useful for catching AI-generated code that injects raw style values without using design tokens.

## Configuration
Enable this rule in `designlint.config.*`:

```json
{ "rules": { "design-system/jsx-style-values": "error" } }
```

No token seeding is required — this rule operates purely on AST structure.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
/* raw color literal */
<Button style={{ color: '#3B82F6' }} />

/* raw numeric spacing */
<Box style={{ padding: 16 }} />
```

### Valid

```tsx
/* token reference */
<Button style={{ color: 'var(--color-button-primary)' }} />

/* zero is always allowed */
<Box style={{ margin: 0 }} />
```

## When Not To Use
If inline style objects are acceptable in your project or you rely on design tokens delivered as runtime values rather than CSS variables, disable this rule.

## Related Rules
- [design-system/no-inline-styles](./no-inline-styles.md)
- [design-token/colors](../design-token/colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
