# design-token/box-shadow

Enforces `box-shadow` values to match the shadows tokens defined in your configuration.

## Configuration

```json
{
  "tokens": { "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" } },
  "rules": { "design-token/box-shadow": "error" }
}
```

Shadow tokens must be strings representing complete `box-shadow` declarations.

## Examples

### Invalid

```css
.box { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
```

### Valid

```css
.box { box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.box { box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2); }
```
