# API

`@lapidist/design-lint` exposes a small Node API for advanced scenarios.

```js
import { Linter, loadConfig, getFormatter } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const results = await linter.lintFiles(['src']);
const formatter = getFormatter('stylish');
console.log(formatter(results));
```

## Exports

- `Linter` – core engine for linting files.
- `loadConfig` – loads a `designlint.config.*` file. See [Configuration](./configuration.md).
- `getFormatter` – retrieves a built-in formatter. See [Usage](./usage.md#options).
- `applyFixes` – apply autofixes to file contents.
- `builtInRules` – array of rule modules bundled with the linter.
