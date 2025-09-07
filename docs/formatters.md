# Formatters

Formatters control how lint results are displayed. Design Lint ships with:

| Name | Description |
| ---- | ----------- |
| `stylish` | human‑readable terminal output (default) |
| `json` | structured data for further processing |
| `sarif` | report for GitHub code scanning |

Select a formatter with `--format`:

```bash
npx design-lint src --format json
```

Custom formatters export a default function that receives an array of results and returns a string.

```js
// minimal-formatter.js
export default function(results) {
  return results.map(r => r.filePath).join('\n');
}
```

Use a custom formatter by path:

```bash
npx design-lint src --format ./minimal-formatter.js
```
