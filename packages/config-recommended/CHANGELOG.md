# @lapidist/design-lint-config-recommended

## 1.0.1

### Patch Changes

- 0c78f3a: Add `prepack` build step and `files` manifest so preset packages ship compiled dist

  The config preset packages were published without running `tsc`, so `dist/index.js` was absent from the npm tarball. Consumers importing the packages received `Cannot find module '…/dist/index.js'`.

  Changes per package:
  - `scripts.prepack`: runs `tsc -p tsconfig.json` automatically before every `npm publish` / `pnpm publish`
  - `files`: `["dist", "src"]` — explicitly declares what the tarball includes so dist is never accidentally omitted
  - `exports["."].source`: `./src/index.ts` — allows TypeScript-aware tools to resolve the source directly

## 1.0.0

### Major Changes

- 5c9a371: v8: DSR kernel integration — remove v7 token fallback, require tokenProvider

  `createLinter` and the `Linter` constructor now throw when `Environment.tokenProvider` is absent. The v7 inline-config fallback (`ConfigTokenProvider` loaded silently from `config.tokens`) has been removed from both `setup.ts` and `linter.ts`. Callers must supply a `tokenProvider` — the DSR kernel is the authoritative source.

  `DsrOptions.beforeConnect` is a new optional async hook that programmatic callers (LSP, MCP, scripts) can use to auto-start the kernel without depending on the CLI's `prepareEnvironment`.

- 5c9a371: Initial release of eight new design-lint v8 packages: config-recommended, config-strict, config-ai-agent, testing (RuleTester), telemetry (DLTS v1 SDK + OTel), mcp (AEP v1 types), lsp (LSP capability types), rdk (Rule Development Kit)

### Minor Changes

- 5c9a371: feat!: v8 release — DSR kernel integration, MCP/LSP/telemetry packages, RuleTester, config presets, and RDK; the linter now delegates token resolution to the DSR kernel when running, removing internal token/rule state ownership

### Patch Changes

- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [3a76856]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
  - @lapidist/design-lint@8.0.0
