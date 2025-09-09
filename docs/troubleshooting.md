---
title: Troubleshooting and FAQ
description: "Diagnose and solve common design-lint problems."
sidebar_position: 12
---

# Troubleshooting and FAQ

This guide helps you resolve common issues when running design-lint.

## Table of contents
- [Design tokens not recognized](#design-tokens-not-recognized)
- [Config file not found](#config-file-not-found)
- [Unknown rule](#unknown-rule)
- [Plugin failed to load](#plugin-failed-to-load)
- [Parser error](#parser-error)
- [CLI crashes](#cli-crashes)
- [CI job fails intermittently](#ci-job-fails-intermittently)
- [FAQ](#faq)
- [See also](#see-also)

## Design tokens not recognized
**Symptom:** Tokens defined in config are ignored.

**Cause:** Token file path is wrong or the file contains invalid JSON.

**Resolution:** Verify token paths and inspect loaded tokens. See [configuration](./configuration.md#tokens).

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

## CLI crashes
**Symptom:** The process exits unexpectedly.

**Cause:** Unhandled exception in a rule or formatter.

**Resolution:** Re-run the command to capture stack traces and file an issue with a minimal reproduction.

## CI job fails intermittently
**Symptom:** Linting passes locally but fails in CI.

**Cause:** Missing cache, differing Node versions, or nondeterministic rules.

**Resolution:** Cache `node_modules`, pin Node to v22, and review custom rules for nondeterminism.

## FAQ
- **How do I disable a rule for a single line?**
  ```js
  // design-lint-disable-next-line design-token/colors
  const color = '#fff';
  ```
 - **How do I share configurations across repos?** Publish an npm package that exports a configuration object and import it from `designlint.config.js` or `designlint.config.ts`.

## See also
- [Usage](./usage.md)
- [Configuration](./configuration.md)
- [Plugins](./plugins.md)
