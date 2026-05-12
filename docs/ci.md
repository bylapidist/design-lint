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
      - uses: pnpm/action-setup@v6
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - name: Start DSR kernel
        run: design-lint kernel start --config-path designlint.config.json
      - run: pnpm exec design-lint "src/**/*" --fail-on-empty --format sarif --output lint.sarif
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
  before_script:
    - corepack enable pnpm
    - pnpm install --frozen-lockfile
  script:
    - design-lint kernel start --config-path designlint.config.json
    - pnpm exec design-lint "src/**/*" --fail-on-empty --format json --output lint.json
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
      - run: corepack enable pnpm && pnpm install --frozen-lockfile
      - run: design-lint kernel start --config-path designlint.config.json
      - run: pnpm exec design-lint "src/**/*" --fail-on-empty --max-warnings 0
workflows:
  lint:
    jobs:
      - lint
```

## Generic pipeline

Any CI system that can run shell commands can execute design-lint:

```bash
pnpm install --frozen-lockfile
design-lint kernel start --config-path designlint.config.json
pnpm exec design-lint "src/**/*" --fail-on-empty --format json --output lint.json
```

## Handling failures

Use `--max-warnings` to fail the build when warnings exceed a threshold and
`--fail-on-empty` to prevent silent success on empty target sets. Cache the
pnpm store to speed up runs using `cache: pnpm` in `actions/setup-node`, and
only cache `.designlintcache` when your command includes `--cache`. See
[formatters](./formatters.md) for report formats and [usage](./usage.md) for
CLI flags.

## See also

- [Formatters](./formatters.md)
- [Usage guide](./usage.md)
