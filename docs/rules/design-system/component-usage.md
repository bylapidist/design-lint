# design-system/component-usage

Disallows raw HTML elements when a design system component should be used instead.

## Configuration

```json
{
  "rules": {
    "design-system/component-usage": [
      "error",
      { "substitutions": { "button": "DSButton" } }
    ]
  }
}
```

### Options

- `substitutions` (`Record<string, string>`): map of disallowed HTML tags to their design system components. Tag names are matched case-insensitively.

## Examples

**Invalid**

```tsx
<button>Save</button>
```

**Valid**

```tsx
<DSButton>Save</DSButton>
```
