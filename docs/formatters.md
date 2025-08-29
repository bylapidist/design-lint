# Formatters

`@lapidist/design-lint` uses formatter functions to turn lint results into human-
or machine-readable output. A formatter receives an array of `LintResult`
objects and an optional `useColor` flag and returns a string to print.

## Built-in formatters

- `stylish` – default, colorized summary intended for terminals.
- `json` – raw JSON results, useful for piping to other tools.
- `sarif` – emits a [SARIF 2.1.0](https://sarifweb.azurewebsites.net/) log for CI systems.

Select a formatter with the `--format` CLI option or the `getFormatter(name)` API.

## Creating a custom formatter

You can supply your own formatter module without modifying
`@lapidist/design-lint`.

1. **Create the formatter module**:

   ```ts
   // minimal-formatter.ts
   import type { LintResult } from '@lapidist/design-lint';

   export default function minimal(results: LintResult[]): string {
     return results.map((r) => `${r.filePath}: ${r.messages.length}`).join('\n');
   }
   ```

2. **Use the formatter from the CLI**:

   ```bash
   npx design-lint src --format ./minimal-formatter.ts
   ```

3. **Or from the API**:

   ```ts
   import { getFormatter } from '@lapidist/design-lint';

   const formatter = await getFormatter('./minimal-formatter.ts');
   console.log(formatter(results));
   ```

Formatters receive a `useColor` boolean as the second argument. Respect this
flag if your formatter supports colored output. For inspiration, see the
built-in formatter implementations in [`src/formatters/`](../src/formatters/).
