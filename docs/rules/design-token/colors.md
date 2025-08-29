# design-token/colors

Disallows raw color values and enforces the color tokens defined in your configuration.

## Configuration

Enable the rule in `designlint.config.*`:

```json
{
  "tokens": { "colors": { "primary": "#ff0000" } },
  "rules": {
    "design-token/colors": ["error", { "allow": ["named"] }]
  }
}
```

### Options

- `allow` (`"hex" | "rgb" | "rgba" | "hsl" | "named"`[]): formats that may appear as raw values. Defaults to `[]`.

## Examples

**Invalid**

```css
.button { color: #00ff00; }
```

**Valid**

```css
.button { color: #ff0000; }
```
