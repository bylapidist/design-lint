# design-system/no-unused-tokens

Reports design tokens defined in your configuration that never appear in any
linted file. This keeps the token set focused and helps uncover stale values
left behind after refactors.

The rule scans each file for raw values like hex colors, numeric spacing values
and `var(--token)` references. Hex codes are matched case‑insensitively and both
CSS variables and literal values are detected.

> [!NOTE]
> Run the linter on the full project to avoid false positives. Tokens referenced
> in files that are excluded from the run will be reported as unused.

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

A CSS variable can also be ignored:

```json
{
  "rules": {
    "design-system/no-unused-tokens": [
      "warn",
      { "ignore": ["--legacy-color"] }
    ]
  }
}
```

## Options

### ignore

Type: `string[]`

Array of token values or CSS variable names to exclude from usage reporting.

```json
{
  "rules": {
    "design-system/no-unused-tokens": ["warn", { "ignore": ["#ff0000"] }]
  }
}
```
