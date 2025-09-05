# design-system/no-unused-tokens

Report design tokens defined in the configuration that are never referenced in source files.

## Examples

Given this configuration:

```json
{
  "tokens": { "colors": { "primary": "#000000", "unused": "#ff0000" } },
  "rules": { "design-system/no-unused-tokens": "warn" }
}
```

and the source:

```ts
const color = '#000000';
```

`#ff0000` is reported as unused.

## Options

### ignore

Type: `string[]`

An array of token values or CSS variables to exclude from usage reporting.

```json
{
  "rules": {
    "design-system/no-unused-tokens": ["warn", { "ignore": ["#ff0000"] }]
  }
}
```
