# design-system/no-inline-styles

Disallows inline `style` and `className` (or `class`) attributes on design system components.

Works with React, Vue, Svelte, and Web Components.

## Configuration

```json
{
  "rules": {
    "design-system/no-inline-styles": [
      "error",
      { "ignoreClassName": false }
    ]
  }
}
```

### Options

- `ignoreClassName` (`boolean`, default: `false`): if `true`, `className`/`class` attributes are ignored.

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
