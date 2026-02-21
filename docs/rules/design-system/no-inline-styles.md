---
title: design-system/no-inline-styles
description: 'Disallow inline style attributes in targeted design-system components.'
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

When `importOrigins` is configured, the rule resolves component origins from TypeScript symbol metadata when available. If symbol metadata is unavailable (for example, when linting without a `Program`), it falls back to an AST-only import map built from static `import` declarations in the same file. The fallback supports default imports, named imports, aliased named imports, and simple namespace member usage (for example, `DS.Button` from `import * as DS from '...';`).

Fallback limitations:

- Only static `import` declarations are considered.
- Re-exports and dynamic imports are not followed.
- Namespace member checks only match direct access from the imported namespace identifier.

When neither `components` nor `importOrigins` is configured, the rule does not report JSX component usage by default.

This rule is not auto-fixable.

## Examples

### Invalid

```tsx
import { Button } from '@acme/design-system';

<Button style={{ color: 'red' }} />;
```

```tsx
<Button className="custom" />
// when Button is included in components/importOrigins and ignoreClassName is false
```

### Valid

```tsx
import { Card } from '@third-party/ui';

<Card style={{ color: 'red' }} />;
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
