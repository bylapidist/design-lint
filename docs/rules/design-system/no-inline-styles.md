---
title: design-system/no-inline-styles
description: "Disallow inline style attributes in targeted design-system components."
---

# design-system/no-inline-styles

## Summary
Disallows inline `style` and `className` (or `class`) attributes on targeted design system components. Works with React, Vue, Svelte, and Web Components.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/no-inline-styles": [
      "error",
      {
        "ignoreClassName": false,
        "components": ["Button"],
        "importOrigins": ["@acme/design-system"]
      }
    ]
  }
}
```

## Options
- `ignoreClassName` (`boolean`, default: `false`): if `true`, `className`/`class` attributes are ignored.
- `components` (`string[]`): explicit design-system component names to lint.
- `importOrigins` (`string[]`): package names treated as design-system import origins.

When neither `components` nor `importOrigins` is configured, the rule does not report JSX component usage by default.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
import { Button } from '@acme/design-system';

<Button style={{ color: 'red' }} />
```

```tsx
<Button className="custom" />
// when Button is included in components/importOrigins and ignoreClassName is false
```

### Valid

```tsx
import { Card } from '@third-party/ui';

<Card style={{ color: 'red' }} />
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
