# @lapidist/design-lint

## 5.4.0

### Minor Changes

- 38331f3: add CSS variable output generator
- 38331f3: add generate CLI command to emit token outputs from config
- 38331f3: add JavaScript and TypeScript token output generators
- 38331f3: support loading a default token set with variant files merged over it
- 38331f3: add token name transforms and path normalization

### Patch Changes

- 38331f3: centralize token file glob constant and document CLI utilities
- 38331f3: unify CLI error handling with shared logger and deduped warnings
- 38331f3: centralize token constant naming in a shared utility and reorganize token tests
- 38331f3: fix linting and formatting issues in tokens command and tests
- 38331f3: reuse token registry for lint command to avoid redundant token flattening
- 38331f3: allow custom warning handlers when resolving token aliases
- 38331f3: refactor: consolidate token helpers into shared utils module with JSDoc coverage
- 38331f3: refactor alias resolution to use shared normalizePath utility
- 38331f3: refactor: centralize flattened token sorting utility
- 38331f3: fix css output generator to sort theme blocks with default first
- 38331f3: refactor to centralize theme record helper and document CLI commands
- 38331f3: add token ingestion pipeline with alias resolution and flattened metadata
- 38331f3: add token registry for theme-based lookup
- 38331f3: generate token outputs during watch mode

## 5.3.0

### Minor Changes

- 6a0460b: extract token setup and scanning into dedicated factory and service
- 6a12102: add plugin init hook and metadata support
- 975590c: add option schema validation for rules

### Patch Changes

- d0cd02c: refactor: add isObject helper and reuse type guards
- 5f612aa: fix compiled imports to include .js extensions so CLI runs in Node
- 21f2d09: feat: make ConfigTokenProvider async and expand config utility tests
- 9c37118: auto-generate built-in rule list from rule modules
- 5f612aa: avoid writing files during tests
- c955e3a: expose builtInFormatterNames alongside built-in formatter utilities
- 242f688: refactor: centralize isRecord type guard
- 307fb66: refactor: centralize isRuleModule helper
- 676e8c8: refactor ast guard implementations and expand tests to achieve full utility coverage
- c955e3a: refactor built-in formatter map and document formatter entry usage
- 21f2d09: deduplicate token parsing in config normalizer and expand tests
- 5f612aa: document utility barrels with package-level JSDoc and add usage examples
- 5f612aa: export color-format helpers from utils index and move ColorFormat type to core
- 21f2d09: extract config search places constant for reuse
- 21f2d09: refactor token guards into shared utilities and update schema usage
- dd4414e: export file type mappings and glob patterns from dedicated module
- c955e3a: add module-level documentation to formatter implementations
- 5f612aa: organize guard utilities by domain-specific barrels and update imports
- c955e3a: refactor formatter helpers into dedicated module and align tests with utils structure
- 6a12102: ensure plugin init runs before token loading
- 5f612aa: move array utilities into collections folder
- 21f2d09: refactor: move token normalization helper to shared utils tokens namespace
- 5f612aa: move rule utilities into shared utils with tests
- 21f2d09: refactor: move token helpers to shared utils and expand tests
- 5f612aa: refactor token validator helpers into shared utils
- 5f612aa: refactor util imports to use namespaced `utils` barrel
- dd0019f: reuse shared isRecord utility in node plugin loader
- 21f2d09: refactor token utilities to deduplicate normalization logic
- 21f2d09: refactor config utilities with comprehensive documentation and test coverage
- 5f612aa: refactor utils into categorized barrels and update imports
- 21f2d09: fix loadTokens to retain inline token metadata
- 5f612aa: refactor style util to reuse helpers
- 21f2d09: refine ConfigTokenProvider loading and export defineConfig as a function
- 21f2d09: refine token utilities with explicit typing and documentation examples
- 5f612aa: refine utility guards with explicit return types and document barrel modules
- 2373389: refactor svelte parser to use official compiler types
- 5f612aa: use bundler module resolution and drop .js extensions from imports
- b23c171: restore Linter constructor overload for backward compatibility
- 288b9b6: refactor formatters into structured modules with comprehensive tests
- bd4c147: refactor color format utilities into shared module
- 601dacc: refactor token tracker to use shared unit helper
- 21f2d09: document token error helper example and sort config exports
- 5f612aa: split jsx utilities into separate modules and add tests
- 5f612aa: refactor type guards into separate modules and add tests
- 5f612aa: refactor(utils): remove redundant color exports and document tokenRule generics

  Improve JSDoc coverage for AST guard helpers with usage examples.

  Clarify color format detection internals and annotate complex rule utilities with inline comments.

- 5f612aa: refine array helpers and replace scattered `Array.isArray` checks with typed `isArray`
- 4a4de7c: fix Svelte parser to traverse fragments inside control-flow blocks
- 21f2d09: tighten token parsing helper and expand schema coverage
- 21f2d09: deduplicate token error handling with `wrapTokenError` helper

## 5.2.0

### Minor Changes

- ed35373: add dedicated PluginError and ConfigError classes and use them for plugin loading and configuration

### Patch Changes

- 83c2110: refactor: reuse shared path utilities in CLI environment
- f321bc4: refactor file type mapping into exportable constant
- 0d08b3c: refactor linter with helper methods and tests
- a7ac5ef: refactor config loading into separate helpers
- cdb9b83: refactor: centralize type guards
- f8a1b31: refactor token rules to share common retrieval logic

## 5.1.0

### Minor Changes

- 3be455d: add location data to flattened tokens and expose getTokenLocation helper
- 3be455d: align token utilities with W3C Design Tokens format and support root $schema
- 3be455d: feat(core): add function to flatten W3C Design Tokens tree
- 3be455d: use Momoa to parse design token files with YAML support and clearer errors
- 3be455d: remove legacy token migration utilities and stop accepting legacy token groups
- 3be455d: add token transform registry and parseDesignTokens transform support
- 3be455d: add token validator registry for extensible validation
- 3be455d: feat: allow config tokens field to accept spec token trees or theme file paths

### Patch Changes

- 3be455d: resolve nested token aliases and record references
- 3be455d: allow $metadata fields in token trees, ignore metadata in token tracking, and accept .tokens.yaml paths in config
- 3be455d: chore: disallow type assertions in library code
- 3be455d: remove legacy token normalization utilities
- 3be455d: feat(cli): add tokens export command to write resolved design tokens
- 3be455d: expose spec-compliant design tokens per theme via config token provider
- 3be455d: avoid migrating spec tokens in config loader to fix CLI smoke test
- 3be455d: fix NodeTokenProvider default-theme detection for inline token configs
- 3be455d: fix NodeTokenProvider misclassifying theme records with primitive metadata entries
- 3be455d: fix smoke test to resolve custom formatter path and here-doc warnings
- 3be455d: refactor border-radius rule to read dimension tokens via getFlattenedTokens
- 3be455d: refactor color rules to read spec tokens via getFlattenedTokens
- 3be455d: refactor opacity rule to read tokens via getFlattenedTokens
- 3be455d: refactor remaining token rules to read flattened spec tokens and update tests accordingly
- 3be455d: refactor spacing rule to read dimension tokens via getFlattenedTokens
- 3be455d: add helper to flatten spec tokens per theme for runtime consumers
- 3be455d: expose getFlattenedTokens in rule context for flattened token access
- 3be455d: handle alias chains and detect circular references in design token parser
- 3be455d: handle primitive token values in token parser
- 3be455d: handle token spec edge cases like alias type mismatches, case-insensitive path collisions, and unknown composite properties
- 3be455d: avoid reporting alias tokens as unused when tracking token usage
- 3be455d: introduce W3C token model scaffolding and export token types
- 3be455d: ensure inline config tokens are loaded when no token provider is supplied
- 3be455d: load config tokens from external `.tokens` files
- 3be455d: merge tokens from all themes when no theme is specified
- 3be455d: migrate legacy token groups during config load
- 3be455d: migrate legacy token groups to W3C Design Tokens format
- 3be455d: refactor token file parser to Node adapter to keep core environment agnostic
- 3be455d: validate color tokens using culori and allow normalizing colors
- 3be455d: preserve $extensions and $deprecated metadata in W3C token parser and flattener
- 3be455d: refactor linter to provide per-theme flattened tokens to rules
- 3be455d: fix getTokenCompletions to list token paths by theme
- 3be455d: reject legacy shorthand token syntax and enforce $type/$value
- 3be455d: reject tokens missing $value and validate mismatched token values
- 3be455d: remove eslint-disable-next-line comments and address lint issues
- 3be455d: remove custom type stubs in favour of library definitions
- 3be455d: remove `LegacyDesignTokens` type in favor of spec `DesignTokens`
- 3be455d: remove legacy token property checks
- 3be455d: remove LegacyRuleContext and detect `$deprecated` tokens
- 3be455d: remove legacy token fallbacks and surface token parse errors
- 3be455d: rename parser folder to framework-parsers
- 3be455d: resolve aliases when flattening design tokens and remove alias filtering in token tracker
- 3be455d: fix theme detection to recognize per-theme tokens defined at the root and export them via the CLI
- 3be455d: add parser for spec-compliant design token files and validate token/group names
- 3be455d: refactor token parser into modular pipeline
- 3be455d: validate composite design token types like shadow, strokeStyle, gradient and typography
- 3be455d: add detailed parser diagnostics with file locations
- 3be455d: fix tokens command to respect global config path option
- 3be455d: include token metadata in unused token reports
- 3be455d: validate alias references in spec token parser
- 3be455d: validate duration and cubicBezier token values and restrict units
- 3be455d: enforce .tokens paths in config and validate token files
- 3be455d: validate tokens have explicit types and enforce per-type semantics
- 3be455d: require design token objects in config and surface token parsing errors

## 5.0.0

### Major Changes

- 34ab02c: refactor linter to accept environment object and delegate token normalization to token provider
- 34ab02c: remove NodeEnvironment backward compatibility alias
- 34ab02c: rename filePath to sourceId and remove deprecated alias

### Minor Changes

- 34ab02c: add environment and token provider interfaces
- 34ab02c: add plugin loader abstraction and Node implementation
- 34ab02c: add rule categories and message metadata support
- 34ab02c: add core entry point and move node helpers under new node namespace
- 34ab02c: expose `createLinter` for programmatic use and rename CLI environment targets to patterns
- 34ab02c: add lintDocument and lintDocuments APIs and update cache processing
- 34ab02c: refactor document source to return LintDocument instead of file paths
- 34ab02c: add variables token group to track custom property values

### Patch Changes

- 34ab02c: add node token provider and update environment
- 34ab02c: refactor caching to use pluggable CacheProvider interface
- 34ab02c: initialize linter with file source, plugin loader, and optional cache provider
- 34ab02c: move node-specific utilities to adapter directory
- 34ab02c: refactor node adapters into adapters/node and add NodeEnvironment factory
- 34ab02c: use document types for parser registry
- 34ab02c: replace lintFiles with lintTargets
- 34ab02c: refactor CLI environment setup to use createNodeEnvironment
- 34ab02c: support variable modes and aliases in design tokens

## 4.10.0

### Minor Changes

- bc4adaf: feat: add optional metadata field to rule context
- fad454a: allow injecting custom document sources and expose default file-based implementation

### Patch Changes

- c7ffed2: refactor token utilities into shared module

## 4.9.0

### Minor Changes

- 6bd2bd0: extract scanning and caching logic into runner module

### Patch Changes

- 0a29269: increase coverage thresholds and add loadIgnore tests
- d0c9edc: refactor parser into language-specific modules and add registry-based dispatch
- 0a29269: use import.meta.resolve for formatter modules and extract init config utilities

## 4.8.3

### Patch Changes

- 81331ea: use array type shorthand to satisfy eslint array-type rule
- 909421c: enforce consistent-type-assertions rule to ban type casting
- a59283c: replace boolean casting with explicit checks in cache manager and no-inline-styles rule
- 81331ea: refactor cache and file services to modules
- a59283c: refactor cache manager to import fs/promises directly instead of aliasing
- 81331ea: ensure watcher callbacks handle async promises
- 81331ea: fix unsafe JSON parsing and parser outputs to satisfy no-unsafe-assignment
- 81331ea: fix: type unsafe member accesses flagged by eslint
- 81331ea: replace regex tests with `String#includes`
- 81331ea: replace logical OR defaults with nullish coalescing operators
- 81331ea: replace regex and index checks with `startsWith`/`endsWith` to satisfy lint rule
- a59283c: refactor config loader to merge results without type assertions
- a59283c: guard parser-service and sarif formatter to avoid non-null assertions
- 81331ea: remove unnecessary String/Number conversions in token rules
- 81331ea: fix remaining lint errors for strict type-checked config
- 81331ea: refactor template literals to use explicit string conversions
- a59283c: type blur rule options to remove casts
- a59283c: type token-border-radius rule options and drop casts
- a59283c: type border-width rule options so units are read without casts
- a59283c: remove cache-manager error casts
- a59283c: type CLI package.json parsing to avoid casts
- a59283c: type color rule options to remove casts
- a59283c: refactor component-prefix rule to use typed options instead of casting
- a59283c: type component-usage rule options to remove cast
- a59283c: type duration tokens in token-duration rule to remove casts
- a59283c: type execute options to remove casts
- a59283c: type guard dynamic formatter imports to remove casts
- a59283c: type icon-usage rule options to remove cast
- a59283c: type import-path rule options
- a59283c: type linter config tokens to avoid casts
- a59283c: type no-inline-styles rule options and drop casts
- a59283c: type parser-service AST helpers and option parsing to remove casts
- a59283c: type plugin loading to remove casts
- a59283c: type spacing rule options, removing runtime casts
- a59283c: type token loader to avoid casts
- a59283c: type token schema to avoid casts
- a59283c: type token tracker rule options to remove casts
- a59283c: type variant-prop rule options to remove casts
- a59283c: type watch mode options so output and report paths don't need casts

## 4.8.2

### Patch Changes

- 19024f2: refactor plugin loading with centralized PluginManager
- 51dc943: refactor CLI run flow into modular helpers for environment setup, execution, and watch mode
- a194c4d: refactor lintFiles to delegate file scanning and cache handling to services
- 8add001: refactor token tracker to use classifier strategy map
- 52906ec: replace string-similarity with leven

## 4.8.1

### Patch Changes

- d9c4ede: fix stylish formatter to output relative paths

## 4.8.0

### Minor Changes

- df018fb: refactor linter into modular architecture with rule registry, parser service, token tracker, and cache manager

### Patch Changes

- d44c263: refactor CLI to use commander, extract watch helper, and include typescript runtime dependency
- d67b6c6: refactor plugin resolution into shared helper and expose resolved paths for watch mode
- 503c22b: refactor CLI to use internal file scanner and drop fast-glob dependency
- 460bbc1: remove redundant design-token/no-unused-tokens rule
- fb3360d: migrate config loader to cosmiconfig and update tests
- 6c63593: replace custom cache with flat-cache
- 4a29a4c: refactor file scanning to use globby for gitignore-aware traversal
- 987c83a: use picomatch for token matching and string similarity for suggestions
- 58751ba: refactor tmp util to use tempy for temporary directories

## 4.7.10

### Patch Changes

- b8e855f: fix matchToken to allow case-insensitive string pattern matching
- 15bf5c1: fix extractVarName to reject invalid characters in variable names
- 45f306c: handle non-positive concurrency values in lintFiles
- 1020b63: prevent string literals from disabling next line linting directives
- e5ed76e: fix relFrom to return empty string for empty target path
- 7d9802b: avoid duplicate reports for single style property strings
- 1b7d616: support design-lint-disable-line directive
- a2f9dda: fix sarif formatter to update rule descriptions from later results
- f537505: fix token matcher wildcard handling

## 4.7.9

### Patch Changes

- 0810760: fix TypeScript config loading to surface actual errors

## 4.7.8

### Patch Changes

- 72ed23f: add scss, sass, and less style parsing including Vue/Svelte lang detection and string style attribute handling

## 4.7.7

### Patch Changes

- 6edf9c9: add lint run statistics to stylish output

## 4.7.6

### Patch Changes

- 1720f52: fix no-unused-tokens rule to handle hex colors case-insensitively
- c7bd1e6: handle React.createElement and h props in isInNonStyleJsx
- b7e026c: broaden Node.js engine requirement to >=22
- 69c1ee0: add OK feedback for files without lint messages in stylish formatter and remove extra newlines
- a564d72: fix getTokenCompletions to handle var() fallbacks and whitespace

## 4.7.5

### Patch Changes

- e9f2c95: restrict token rules to style values to avoid false positives in TSX

## 4.7.4

### Patch Changes

- 93a3f64: ignore non-style JSX attributes in colors and deprecation rules to avoid false positives

## 4.7.3

### Patch Changes

- a46c217: fix config loader to handle nested default exports

## 4.7.2

### Patch Changes

- 699fc16: fix extractVarName to support whitespace and fallback values
- be70734: fix loading TypeScript configs that import the package entry to avoid require cycles

## 4.7.1

### Patch Changes

- 7a146b2: ensure file changes bust cache even when mtime is unchanged
- f43aac4: fix CLI glob expansion to handle brace patterns
- c902951: fix TypeScript config loading by always treating .ts files as ESM
- 84790db: fix token-opacity to flag zero values in CSS
- 91eaf52: fix token rules to ignore numbers in non-style JSX props

## 4.7.0

### Minor Changes

- 7628035: rename rule to design-system/no-unused-tokens and support ignoring tokens

## 4.6.0

### Minor Changes

- bfcfda8: expand CLI targets to support directories and glob patterns
- 3de0170: add support for linting CSS in tagged template literals in JS/TS files
- 6302875: allow token groups to define CSS variable patterns
- 828cb63: add token suggestion reporting and completion API

### Patch Changes

- 4bae965: ignore ENOENT when reading cache file in loadCache to avoid spurious warnings

## 4.5.0

### Minor Changes

- a286195: support multiple theme roots with merged tokens and theme-aware validation

## 4.4.0

### Minor Changes

- d4f9a1d: add optional wrapTokensWithVar to normalize tokens as CSS variables

## 4.3.2

### Patch Changes

- 31d5649: report parse-error when file cannot be read
- ffbe957: replace dynamic chalk import with static import
- f8603f7: use atomic writes for cache to prevent corruption

## 4.3.1

### Patch Changes

- eda5925: add config init hint when config file is missing

## 4.3.0

### Minor Changes

- 9b0d34c: add component-prefix rule to enforce design system component prefixes
- 6a15725: add variant-prop rule to enforce allowed component variants
- 8230686: add icon-usage rule to discourage raw svg elements and non-design system icon components
- 45ac558: add import-path rule to ensure design system components are imported from allowed packages
- 5332dcb: add no-inline-styles rule to report style and className usage on design system components

## 4.2.0

### Minor Changes

- c931042: add animation, blur, border-color, opacity, and outline design token rules and remove deprecated token groups

## 4.1.4

### Patch Changes

- 17c4fe0: publish docs to github pages

## 4.1.3

### Patch Changes

- e80eb86: replace ts-node with tsx for loading TypeScript config files to avoid fs.Stats deprecation warning

## 4.1.2

### Patch Changes

- e5da749: avoid invalid '.' paths when scanning the current directory
- 7945e53: remove redundant atomic write wrapper and use library directly

## 4.1.1

### Patch Changes

- 7756088: refactor token-colors rule to use color-string for color parsing
- 7838fd2: use find-up to simplify config file discovery
- d606120: replace custom atomic write implementation with write-file-atomic

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
