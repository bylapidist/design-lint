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

For `importOrigins`, the rule first uses symbol/type metadata when available. If TypeChecker symbol data is unavailable, it falls back to an AST-only import map built from `ImportDeclaration` nodes in the same file.

AST fallback supports:
- Default imports: `import Button from '@acme/design-system'`
- Named imports: `import { Button } from '@acme/design-system'`
- Aliased named imports: `import { Button as DSButton } from '@acme/design-system'`
- Simple namespace member usage: `import * as DS from '@acme/design-system'` with `<DS.Button />`

AST fallback limits:
- Matches only identifiers/member expressions directly associated with local import bindings in the current file.
- Does not resolve re-exports, transitive imports, or complex expression-based JSX tag names.

When neither `components` nor `importOrigins` is configured, the rule reports a configuration diagnostic and skips component checks until one of those options is provided.

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
