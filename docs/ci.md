# Continuous Integration

Use Design Lint in CI to prevent design regressions.

## GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx design-lint src --max-warnings 0
```

## GitLab CI

```yaml
# .gitlab-ci.yml
lint:
  image: node:22
  script:
    - npm ci
    - npx design-lint src --format json --output lint.json
  artifacts:
    paths:
      - lint.json
```

## Tips

- Cache `node_modules` or the `.designlintcache` file to speed up repeated runs.
- Fail the job on warnings with `--max-warnings 0`.
