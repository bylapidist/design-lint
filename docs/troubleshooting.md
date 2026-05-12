---
title: Troubleshooting and FAQ
description: "Diagnose and solve common design-lint problems."
sidebar_position: 12
---

# Troubleshooting and FAQ

This guide helps you resolve common issues when running design-lint.

## Table of contents
- [DSR kernel not running](#dsr-kernel-not-running)
- [Design tokens not recognized](#design-tokens-not-recognized)
- [Config file not found](#config-file-not-found)
- [Unknown rule](#unknown-rule)
- [Plugin failed to load](#plugin-failed-to-load)
- [Parser error](#parser-error)
- [CLI crashes](#cli-crashes)
- [CI job fails intermittently](#ci-job-fails-intermittently)
- [FAQ](#faq)
- [See also](#see-also)

## DSR kernel not running
**Symptom:** `DSR kernel failed to start` or connection refused errors.

**Cause:** The DSR kernel daemon is not running. It must be started before any lint command.

**Resolution:** Start the kernel:
```bash
design-lint kernel start --config-path designlint.config.json
design-lint kernel status
```
After a reboot or on a fresh CI runner, the kernel must be started explicitly. See the [usage guide](./usage.md#the-dsr-kernel) and [CI guide](./ci.md) for setup.

## Design tokens not recognized
**Symptom:** Rules report "no tokens configured" or all token checks pass when they should fail.

**Cause:** The DSR kernel is running but was not seeded with your token file.

**Resolution:** Restart the kernel with your config path so it loads your DTIF token catalog:
```bash
design-lint kernel start --config-path designlint.config.json
```
Verify the kernel is running and has token data with `design-lint kernel status`.

## Config file not found
**Symptom:** `Error: Config file not found`.

**Cause:** No configuration file or incorrect path.

**Resolution:** Run `npx design-lint init` or pass `--config` with the correct path.

## Unknown rule
**Symptom:** `Unknown rule "..."`.

**Cause:** Rule name misspelled or plugin missing.

**Resolution:** Check spelling and ensure the plugin is installed and listed in `plugins`.

## Plugin failed to load
**Symptom:** `Error: Failed to load plugin`.

**Cause:** Node.js cannot resolve the module or it exports the wrong shape.

**Resolution:** Ensure the package is resolvable and exports an object with a `rules` array.

## Parser error
**Symptom:** `ParserError` or similar message.

**Cause:** File extension or `lang` attribute does not match the contents.

**Resolution:** Confirm file types and language blocks are correct.

For stylesheet parsing failures, design-lint emits a deterministic `parse-error` diagnostic with normalized locations (line/column default to `1:1` when unavailable). Indented `.sass` syntax is currently not supported and reports a `parse-error` at `1:1`; migrate files to `.scss` for full Sass linting support.

## CLI crashes
**Symptom:** The process exits unexpectedly.

**Cause:** Unhandled exception in a rule or formatter.

**Resolution:** Re-run the command to capture stack traces and file an issue with a minimal reproduction.

## CI job fails intermittently
**Symptom:** Linting passes locally but fails in CI.

**Cause:** Kernel not started in CI, missing cache, differing Node versions, or nondeterministic rules.

**Resolution:** Ensure the DSR kernel is explicitly started before linting in your CI pipeline. Cache `node_modules`, pin Node to v22, and review custom rules for nondeterminism. See the [CI guide](./ci.md) for working pipeline examples.

## FAQ
- **How do I disable a rule for a single line?**
  ```js
  // design-lint-disable-next-line design-token/colors
  const color = '#fff';

  const other = '#000'; // design-lint-disable-line design-token/colors
  ```
  To suppress all rules for a block, use `/* design-lint-disable */` and `/* design-lint-enable */`.
 - **How do I share configurations across repos?** Publish an npm package that exports a configuration object and import it from `designlint.config.js` or `designlint.config.ts`.

## See also
- [Usage](./usage.md)
- [Configuration](./configuration.md)
- [Plugins](./plugins.md)
