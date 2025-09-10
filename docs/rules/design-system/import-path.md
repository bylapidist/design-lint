---
title: design-system/import-path
description: 'Restrict imports to approved component entry points.'
---

# design-system/import-path

## Summary

Ensures design system components are imported from specific packages. Works with React, Vue, Svelte, and Web Components.

## Configuration

Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/import-path": [
      "error",
      { "packages": ["@acme/design-system"], "components": ["Button"] }
    ]
  }
}
```

## Options

- `packages` (`string[]`): allowed package names for design system components.
- `components` (`string[]`): component names that must come from the specified packages.

This rule is not auto-fixable.

## Examples

### Invalid

```ts
import { Button } from 'other-package';
```

### Valid

```ts
import { Button } from '@acme/design-system';
```

## When Not To Use

If component import sources are not enforced, disable this rule.

## Related Rules

- [design-system/component-prefix](./component-prefix.md)
- [design-system/component-usage](./component-usage.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
