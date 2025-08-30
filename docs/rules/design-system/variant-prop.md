# design-system/variant-prop

Ensures that specified components use only allowed values for their variant prop.

Works with React, Vue, Svelte, and Web Components.

## Configuration

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

### Options

- `components` (`Record<string, string[]>`): map of component names to their allowed variant values.
- `prop` (`string`, default: `"variant"`): prop name to validate.

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
