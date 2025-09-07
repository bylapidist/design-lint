# API

Design Lint can be used programmatically in Node.js.

```ts
import { Linter, loadConfig } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const results = await linter.lintFiles(['src']);
console.log(results[0].messages);
```

## Linter

### `new Linter(config)`
Creates a linter instance.

### `lintFiles(paths: string[])`
Lint an array of file paths or glob patterns. Returns a promise of results.

### `lintFile(path: string)`
Lint a single file.

## Types

TypeScript types are included. Refer to the source for detailed interfaces.
