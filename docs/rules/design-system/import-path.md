# design-system/import-path

Ensures design system components are imported from specific packages.

Works with React, Vue, Svelte, and Web Components.

## Configuration

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

### Options

- `packages` (`string[]`): allowed package names for design system components.
- `components` (`string[]`): component names that must come from the specified packages.

## Examples

### Invalid

```ts
import { Button } from 'other-package';
```

### Valid

```ts
import { Button } from '@acme/design-system';
```
