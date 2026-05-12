---
title: design-system/no-hardcoded-spacing
description: "Disallow hard-coded spacing and dimension values."
---

# design-system/no-hardcoded-spacing

## Summary
Flags numeric and string literals used directly as spacing or sizing values in JSX inline styles and CSS declarations. Zero is always allowed. This rule targets the common pattern where AI coding agents hard-code pixel values (`padding: 16`, `gap: '8px'`) instead of referencing spacing or dimension tokens.

Checked CSS properties: `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `margin-inline`, `margin-block`, `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`, `padding-inline`, `padding-block`, `gap`, `row-gap`, `column-gap`, `top`, `right`, `bottom`, `left`, `inset`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` (and their camelCase JSX equivalents).

## Configuration
Enable this rule in `designlint.config.*`:

```json
{ "rules": { "design-system/no-hardcoded-spacing": "error" } }
```

No token seeding is required — this rule operates on AST structure. To also enforce that spacing values match your token catalog, pair it with [`design-token/spacing`](../design-token/spacing.md).

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
/* hard-coded pixel value in JSX */
<Box style={{ padding: 16 }} />
<Box style={{ gap: '8px' }} />
```

```css
/* hard-coded px value in CSS */
.box { margin: 12px; }
```

### Valid

```tsx
/* zero is allowed */
<Box style={{ margin: 0 }} />

/* token reference */
<Box style={{ padding: 'var(--spacing-md)' }} />
```

```css
/* CSS variable reference */
.box { margin: var(--spacing-sm); }
```

## When Not To Use
If your project permits hard-coded spacing values or spacing is not managed via tokens, disable this rule.

## Related Rules
- [design-token/spacing](../design-token/spacing.md)
- [design-system/jsx-style-values](./jsx-style-values.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
