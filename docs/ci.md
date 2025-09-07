# Continuous Integration

Use Design Lint in CI to prevent design regressions.

## Why design-lint in CI matters

Running the linter on every commit catches visual regressions before they ship, keeps design tokens consistent across branches and gives remote contributors immediate feedback. Adding design-lint to CI makes your design system enforceable, not just aspirational.

## GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    env:
      DESIGN_LINT_MAX_WARNINGS: 0 # fail the job on any warning
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22 # run on Node.js 22

      - uses: actions/cache@v4
        with:
          path: ~/.npm # cache the npm download cache
          key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      - run: npm ci

      - run: npx design-lint src --max-warnings $DESIGN_LINT_MAX_WARNINGS --format sarif --output lint.sarif

      - uses: actions/upload-artifact@v4
        with:
          name: design-lint-report # name shown in the workflow run
          path: lint.sarif # upload SARIF for further analysis
```

## GitLab CI

```yaml
# .gitlab-ci.yml
lint:
  image: node:22
  variables:
    DESIGN_LINT_MAX_WARNINGS: 0 # fail on warnings
  cache:
    key: "$CI_COMMIT_REF_SLUG" # reuse dependencies per branch
    paths:
      - node_modules/ # cache installed packages
  script:
    - npm ci
    - npx design-lint src --format json --output lint.json --max-warnings $DESIGN_LINT_MAX_WARNINGS
  artifacts:
    paths:
      - lint.json # expose report for download
```

## Jenkins

```groovy
// Jenkinsfile
pipeline {
  agent any
  environment {
    DESIGN_LINT_MAX_WARNINGS = '0' // fail the build on warnings
  }
  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
        stash name: 'deps', includes: 'node_modules/**' // cache dependencies for later stages
      }
    }
    stage('Lint') {
      steps {
        unstash 'deps' // restore cached dependencies
        sh "npx design-lint src --format json --output lint.json --max-warnings $DESIGN_LINT_MAX_WARNINGS"
        archiveArtifacts artifacts: 'lint.json', fingerprint: true // upload report
      }
    }
  }
}
```

## Other CI services

Any provider that can run shell commands can lint your project:

```bash
npm ci
npx design-lint src
```

## Failing on warnings

`--max-warnings` exits with an error when the number of warnings exceeds the threshold. See the [usage guide](usage.md#command-line-options) for all CLI flags.

```bash
npx design-lint src --max-warnings 0
```

## Parallelization

Large projects can split linting across jobs or limit concurrency. Use `--concurrency` to control parallel file processing as described in the [usage guide](usage.md#command-line-options).

```yaml
# Example matrix in GitHub Actions
strategy:
  matrix:
    part: ["src/a", "src/b"]
steps:
  - run: npx design-lint ${{ matrix.part }} --concurrency 4
```

## Machine-readable reports

Output JSON or SARIF to integrate with custom tooling or code scanning. Available formatter options are documented in [formatters](formatters.md).

```bash
# SARIF for GitHub code scanning
npx design-lint src --format sarif --output lint.sarif

# JSON for custom scripts
npx design-lint src --format json --output lint.json
```

