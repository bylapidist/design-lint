# @lapidist/design-lint

## 4.1.0

### Minor Changes

- 4bdc354: add inline disable directives to ignore linting for lines or blocks

## 4.0.0

### Major Changes

- acb979f: flatten typography tokens into top-level configuration

## 3.0.0

### Major Changes

- 2fd8613: feat: load custom formatter modules by path and make getFormatter async

### Minor Changes

- 8b39086: add border-radius design token rule
- a152636: add border-width design token rule
- 8e9317c: add box-shadow design token rule
- fcf6955: add duration design token rule
- adb42da: add font-weight design token rule
- 3781974: add line-height design token rule
- c2bb6af: add optional token groups for radii, border widths, shadows and durations
- 2c8ba7e: add defineConfig helper for typed TypeScript configs
- 07712f0: detect TypeScript during init and allow choosing any config format
- 46a1561: feat: split typography rule into font-size and font-family

### Patch Changes

- 1cb7727: add letter-spacing design token rule
- d85c233: support additional color functions in token-colors rule
- 5fdb590: add z-index token rule
- 70f0ceb: refactor config loading to use async fs APIs and test all config formats
- 86b2c72: add CLI option to configure cache file location
- 2c3e91e: test cache load/save with fs mocks
- d8576c1: ensure CLI reports missing plugin files before linting
- 90127e3: use dynamic import for ts-node when loading TypeScript config
- 0f9a1f1: avoid watching non-existent plugin and ignore files in watch mode
- 76df676: fix docs-only change detection in CI workflow
- 2fd8613: add formatter documentation and links
- f304edd: inspect template literals and prefix unary expressions in token rules
- 33c4967: add jsdoc comments to utility functions
- 9d39913: throw error when specified config file is missing
- 8a93835: warn when no files match provided patterns
- 37dbb6f: preserve file permissions in atomic write
- a55404f: suppress "No files matched" warning when --quiet is used
- 8a492d5: remove duplicate ignore patterns
- b7206d1: report coverage in CI and PR comments with a detailed summary
- 747e12a: return warning flag when no files match provided patterns
- 1053c82: use rule descriptions in SARIF output
- 9fd5125: refactor engine into modular components
- d5eb3e1: fix token-colors rule column reporting for mid-string and css values
- 70bb8b9: enforce unique plugin rule names and improve duplicate detection
- 696da0b: use createRequire to load CommonJS config files
- 9bbe55f: use static p-limit import
- 35d06c5: validate cache entries and surface parsing errors
- aa7d2a0: validate missing ignore file path in CLI

## 2.0.0

### Major Changes

- 3c9cc8f: convert package to pure ESM and simplify build and tests

### Patch Changes

- 3c9cc8f: fix CLI to run when invoked through a symlink
- 3c9cc8f: fix CLI main check for ESM runtime
- 3838305: populate package metadata
- 3a39138: prevent watch mode re-lint loops from output and report files

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
