---
"@lapidist/design-lint-config-recommended": patch
"@lapidist/design-lint-config-strict": patch
"@lapidist/design-lint-config-ai-agent": patch
---

Add `prepack` build step and `files` manifest so preset packages ship compiled dist

The config preset packages were published without running `tsc`, so `dist/index.js` was absent from the npm tarball. Consumers importing the packages received `Cannot find module '…/dist/index.js'`.

Changes per package:
- `scripts.prepack`: runs `tsc -p tsconfig.json` automatically before every `npm publish` / `pnpm publish`
- `files`: `["dist", "src"]` — explicitly declares what the tarball includes so dist is never accidentally omitted
- `exports["."].source`: `./src/index.ts` — allows TypeScript-aware tools to resolve the source directly
