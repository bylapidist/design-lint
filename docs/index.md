---
layout: home
title: "@lapidist/design-lint"
titleTemplate: Align design and delivery with automated linting
description: >-
  @lapidist/design-lint keeps product code bases aligned with Design Token Interchange
  Format (DTIF) sources by pairing token awareness with framework integrations and
  extensible rule sets.
hero:
  name: design-lint
  text: Design systems that ship consistently
  tagline: "Keep components, tokens, and styles aligned with a <a href=\"https://dtif.lapidist.net\">DTIF-native</a> linter built for teams."
  actions:
    - theme: brand
      text: Get started
      link: /usage
    - theme: alt
      text: Browse the rules
      link: /rules/
    - theme: minimal
      text: Explore examples
      link: /examples/
features:
  - icon: 🧭
    title: Guided adoption
    details: Follow practical guides, migration steps, and troubleshooting recipes to roll the linter out across teams.
  - icon: 🪄
    title: Token-native automation
    details: Parse DTIF documents, enforce naming, and validate usage with dedicated design-system and token rules.
  - icon: 🚦
    title: CI compatible (experimental)
    details: Static-analysis diagnostics, formatter outputs, and caching support CI pipelines while the project remains pre-production.
---

<!-- markdownlint-disable MD033 -->

<section class="home-section" aria-labelledby="why-design-lint">

## Why teams choose design-lint {#why-design-lint}

design-lint brings design decisions into your repositories so visual integrity stays intact
from pull request to production. By understanding Design Token Interchange Format (DTIF)
files natively, the linter speaks the same language as your design platform and codebase.

### Purpose-built for design tokens

- Normalise typography, colour, spacing, and motion values with the canonical DTIF parser.
- Align components and styling to shared tokens instead of duplicating constants per
  project.
- Catch drift early with granular diagnostics that explain what to fix and why it matters.

### Shared context for designers and engineers

- Give engineers the same terminology designers use when reviewing UI implementation.
- Extend the core rule set to cover organisation-specific patterns and naming schemes.
- Surface actionable feedback in editors, terminals, and continuous integration jobs.

</section>

<section class="home-section" aria-labelledby="make-tokens-actionable">

## Make tokens actionable in any stack {#make-tokens-actionable}

design-lint recognises frameworks and file types common to design system work so teams can
adopt linting without changing their tools.

- Enforce configured component usage and props across React, Vue, Svelte, and vanilla projects.
- Lint styles authored in CSS, CSS-in-JS, and preprocessors while respecting token
  semantics.
- Generate consistent output through built-in formatters or your own custom pipeline.

> “design-lint let us retire bespoke lint scripts and rely on a single, token-aware tool.” – Early adopter feedback

</section>

<section class="home-section" aria-labelledby="automation">

## Automate carefully {#automation}

Integrate the linter in CI with explicit guardrails. The project is still pre-production and
lint coverage is limited to supported static patterns.

- Command-line usage fits into npm scripts, Nx workspaces, and other task runners.
- CI recipes cover GitHub Actions, GitLab CI/CD, and other popular platforms.
- Cached runs and incremental linting keep feedback loops fast for large repositories.

</section>

<section class="home-section" aria-labelledby="get-involved">

## Get involved {#get-involved}

The project welcomes feedback from teams putting design-lint into practice.

- Share migration stories, workflows, and fixes in the [guides](/usage) to help others.
- Contribute new [rules](/rules/) or [formatters](/formatters) that capture your
  organisation's needs.
- Explore the [examples](/examples/) to start quickly or open a PR when you improve
  them.

Join us in building automation that keeps design systems and implementation in sync.

</section>

<!-- markdownlint-enable MD033 -->
