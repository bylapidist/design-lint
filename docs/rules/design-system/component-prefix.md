# design-system/component-prefix

Enforces a prefix for design system component names.

Works with React, Vue, Svelte, and Web Components.

## Configuration

```json
{
  "rules": {
    "design-system/component-prefix": [
      "error",
      { "prefix": "DS" }
    ]
  }
}
```

### Options

- `prefix` (`string`, default: `"DS"`): required prefix for component names.

## Examples

### Invalid

```tsx
<Button />
```

### Valid

```tsx
<DSButton />
```
