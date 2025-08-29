# Continuous Integration

Guidance on running `@lapidist/design-lint` in CI environments.

## GitHub Actions

The following workflow caches dependencies and the linter's persistent cache, then uploads results in the [SARIF](formatters.md#sarif) format for GitHub code scanning.

```yaml
name: Design lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/cache@v4
        with:
          path: .designlintcache
          key: design-lint-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
      - run: npm ci
      - run: npx design-lint src --format sarif --output design-lint.sarif --cache
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: design-lint.sarif
```

The `--format sarif` option enables integration with GitHub's code scanning alerts. Caching improves performance by avoiding reprocessing unchanged files.
