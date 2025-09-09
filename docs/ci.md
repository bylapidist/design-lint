---
title: Continuous Integration
description: "Run design-lint in CI pipelines to prevent regressions."
sidebar_position: 10
---

# Continuous Integration

This guide targets CI engineers integrating design-lint into automated workflows.

## Table of contents
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [CircleCI](#circleci)
- [Generic pipeline](#generic-pipeline)
- [Handling failures](#handling-failures)
- [See also](#see-also)

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
      - run: npx design-lint "src/**/*" --format sarif --output lint.sarif
      - uses: actions/upload-artifact@v4
        with:
          name: design-lint-report
          path: lint.sarif
```

## GitLab CI
```yaml
# .gitlab-ci.yml
lint:
  image: node:22
  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - node_modules/
  script:
    - npm ci
    - npx design-lint "src/**/*" --format json --output lint.json
  artifacts:
    paths:
      - lint.json
```

## CircleCI
```yaml
# .circleci/config.yml
version: 2.1
jobs:
  lint:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run: npm ci
      - run: npx design-lint "src/**/*" --max-warnings 0
workflows:
  lint:
    jobs:
      - lint
```

## Generic pipeline
Any CI system that can run shell commands can execute design-lint:

```bash
npm ci
npx design-lint "src/**/*" --format json --output lint.json
```

## Handling failures
Use `--max-warnings` to fail the build when warnings exceed a threshold. Cache `node_modules` or the `.designlintcache` directory to speed up runs. See [formatters](./formatters.md) for report formats and [usage](./usage.md) for CLI flags.

## See also
- [Formatters](./formatters.md)
- [Usage guide](./usage.md)
