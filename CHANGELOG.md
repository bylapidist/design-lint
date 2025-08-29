# @lapidist/design-lint

## 1.0.0

### Major Changes

- cb8fa3f: remove deprecated lintFilesLegacy method

### Patch Changes

- a02e270: allow --max-warnings 0 in CLI and document usage
- f079704: fix: abort CLI on unsupported Node.js versions
- d6b431e: fix: dynamically import color-name in token-colors rule and add smoke test
- 0aeca97: replace color-name dependency with inline file
- fd608fd: ensure ESM plugins reload in watch mode via cache-busting imports

## 0.7.2

### Patch Changes

- f461269: fix CLI to dynamically import chalk in CommonJS build

## 0.7.1

### Patch Changes

- fc87bc6: Replace eval-based imports with dynamic import.
- e069935: fix lintFile to handle lintFiles return format

## 0.7.0

### Minor Changes

- dee912a: Add async writeFileAtomic using fs.promises and update CLI.
- ca7edda: feat: allow custom file patterns via `patterns` config option
- 2b320f6: Add lintFile convenience method delegating to lintFiles.
- 6821757: feat: return object from lintFiles

### Patch Changes

- fc13c4b: Add autofix for component usage rule
- 21f3d3e: use dynamic import for p-limit to support esm deps

## 0.6.1

### Patch Changes

- fce614e: fix: support ESM chalk in CLI

## 0.6.0

### Minor Changes

- c89b48a: Add SARIF rules metadata

### Patch Changes

- 9696958: Ensure temporary files are removed when atomic writes fail
- 08496e0: Validate numeric CLI options
- a9d211c: Handle watcher errors in CLI

## 0.5.0

### Minor Changes

- 05c39d1: Enable persistent caching
- 9bf2f1c: Add max-warnings option to CLI.

### Patch Changes

- 0ce8ca8: feat: handle nested functions in spacing rule
- e0e5523: fix chalk import for esm
- 417d7bf: add HSLA color detection

## 0.4.0

### Minor Changes

- 0b98dad: Add `--concurrency` option to limit parallel lint tasks.
- 48a442d: support disabling rules with 'off'
- ecb9a63: support svelte style parsing
- d71367f: feat: add ESM build alongside CommonJS output
- 74b7776: Support loading ESM configuration files.
- 32b77a4: support TypeScript config files
- 225d4eb: support gitignore
- 4c85afc: Add --ignore-path option to load additional ignore patterns.
- 39be30e: add configurable concurrency limit
- 160721f: Add configurable units option to spacing rule.

### Patch Changes

- 3ece827: include mjs, cjs, mts, and cts extensions in linting
- 49a0ca2: support nested ignore files
- abcaef8: Skip numeric checks inside CSS functions for spacing rule.
- d942f97: support unit-based font-size tokens
- 8130c18: Catch errors from watch callbacks to prevent unhandled rejections.
- 1268a21: clear cache when watched file is deleted
- b75ad76: validate plugin rule fields and reload when ignore files are removed
- 8299c65: use chokidar for watch mode
- 15be1e6: use color-name package for named colors
- eea7507: Use direct dynamic import for ESM config loading.
- 7b3667b: fix case-insensitive tag matching in component-usage rule
- cc6c829: Reload config and ignore patterns in watch mode
- aff6c4d: Update cache mtime after fixing files to avoid unnecessary re-lints.
- 4090636: limit concurrent file linting to avoid EMFILE
- ee11a7c: Handle plugin reload errors in watch mode.
- 6de9687: Handle overlapping fix ranges deterministically and watch ignore files on unlink.
- 7302239: normalize hex color comparison and restrict lengths
- 823cceb: ensure watcher closes on process termination
- d63b3a6: report unknown rule names in configuration
- 488eec9: Warn when enabling token rules without required tokens.
- 59d107d: watch: reload on nested ignore file changes
- c9f31b3: Prevent plugin rule name collisions.
- 647458f: reload plugin watch paths
- 568285a: restore original .mts require handler after loading config
- f227309: Fix npx usage and CLI entry
- 71019b9: refactor ignore handling into shared utility
- 91e2f72: export applyFixes and cover overlapping fix ranges
- fe86b05: Default line and column numbers now start at 1
- 3a7aebf: Extract Svelte bound style declarations via AST traversal.
- cb697ee: support additional color formats
- 67c01f0: Initialize CLI color output to respect TTY and chalk color support.
- 890e80e: add svelte compiler type declarations
- 4ebaa40: Fix Windows path, ESM, and watcher issues
- 418b81f: fix watcher unlink handler to reload ignores correctly when files are deleted

## 0.3.1

### Patch Changes

- eb3064e: fix npm publish by setting access to public

## 0.3.0

### Minor Changes

- ae5605a: add watch mode with incremental caching and benchmarking scripts

## 0.2.0

### Minor Changes

- 3829b33: Add colorized CLI output, JSON reporting, and contextual error messages.

## 0.1.1

### Patch Changes

- c5f12b4: replace outdated changeset with new entry
