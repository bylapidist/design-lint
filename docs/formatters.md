# Formatters

Formatters control how lint results are displayed.

## Built-in formatters

Design Lint ships with three built-in formatters:

| Name | Ideal use case |
| ---- | -------------- |
| `stylish` | Human-friendly terminal output during development |
| `json` | Structured data for automation or dashboards |
| `sarif` | Reports for security scanners like GitHub code scanning |

Select a formatter with `--format`:

```bash
npx design-lint src --format json
```

### `stylish`

Default formatter suited for local runs. It prints results with colors and a summary.

```text
a.ts
  1:1  error  msg  rule
1 problems (1 errors, 0 warnings)
```

### `json`

Use when you need machine-readable output for scripts or dashboards.

```json
[
  {
    "filePath": "a.ts",
    "messages": [
      {
        "ruleId": "rule",
        "message": "msg",
        "severity": "error",
        "line": 1,
        "column": 1
      }
    ]
  }
]
```

### `sarif`

Generates a SARIF 2.1.0 report for services that ingest SARIF, such as GitHub code scanning.

```json
{
  "runs": [
    {
      "tool": { "driver": { "name": "design-lint" } },
      "results": [
        { "ruleId": "rule", "message": { "text": "msg" } }
      ]
    }
  ]
}
```

## Custom formatter tutorial

Custom formatters export a default function that receives an array of results and returns a string. The steps below show how to build, test, and publish one.

### 1. Project structure

```text
my-formatter/
├─ package.json
├─ formatter.js
└─ test.js
```

`package.json`:

```json
{
  "name": "my-formatter",
  "type": "module",
  "scripts": { "test": "node test.js" }
}
```

`formatter.js`:

```js
export default function (results) {
  return results.map((r) => r.filePath).join('\n');
}
```

`test.js`:

```js
import assert from 'node:assert/strict';
import formatter from './formatter.js';

const out = formatter([{ filePath: 'a.ts', messages: [] }]);
assert.equal(out, 'a.ts');
```

### 2. Run tests

Install Design Lint and execute the test script:

```bash
npm install --save-dev @lapidist/design-lint
npm test
```

### 3. Publish and use

Publish the formatter to npm so it can be referenced by name:

```bash
npm publish
npx design-lint src --format my-formatter
```

You can also use a relative path without publishing:

```bash
npx design-lint src --format ./formatter.js
```

## Integrating with other tools

The `json` formatter can feed results into custom scripts or dashboards. The `sarif` output is compatible with GitHub code scanning and other SARIF-aware services, enabling lint results to surface in external tools.

