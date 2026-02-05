---
layout: home
title: "@lapidist/design-lint"
titleTemplate: Design system governance for production UI
description: >-
  design-lint enforces design tokens, component usage, and UI rules so teams can
  prevent design drift before it ships.
hero:
  name: Design system governance
  text: Stop design drift before it ships.
  tagline: "design-lint enforces tokens, components, and design rules directly in your codebase — including AI-generated output."
  actions:
    - theme: brand
      text: Get started
      link: /usage
    - theme: alt
      text: Read the docs
      link: /configuration
---

<!-- markdownlint-disable MD033 -->

<section class="landing-section landing-problem" aria-labelledby="problem">

<div class="section-header">

## Modern teams don’t fail at design. They fail at consistency. {#problem}

<p class="section-lede">
Speed has outpaced review cycles. Systems exist, but enforcement is inconsistent. The result
is drift that spreads across pages and contributors.
</p>

</div>

<ul class="landing-list">
  <li>Agentic tools generate UI faster than teams can review it.</li>
  <li>Design tokens exist, but aren’t enforced.</li>
  <li>Visual hierarchy decays across pages and contributors.</li>
  <li>Reviews catch problems too late.</li>
</ul>

</section>

<section class="landing-section landing-pillars" aria-labelledby="pillars">

<div class="section-header">

## Governance that stays enforceable at scale {#pillars}

<p class="section-lede">
Design-lint translates design system decisions into rules your codebase can
consistently enforce.
</p>

</div>

<div class="pillar-grid">
  <div class="pillar">
    <h3>DTIF-native</h3>
    <p>Understands design tokens as structured data, not strings.</p>
  </div>
  <div class="pillar">
    <h3>Rule-driven design authority</h3>
    <p>Encodes design system decisions into enforceable rules.</p>
  </div>
  <div class="pillar">
    <h3>Human + AI safe</h3>
    <p>Keeps agent-generated UI aligned with your system.</p>
  </div>
</div>

</section>

<section class="landing-section landing-deep" aria-labelledby="tokens-source">

<div class="deep-grid">
  <div class="deep-copy">
    <h2 id="tokens-source">Design tokens as the source of truth</h2>
    <p>
      Tokens are parsed and normalised through the canonical DTIF pipeline so the linter
      evaluates the same artifacts that power your system.
    </p>
    <ul>
      <li>Canonical parsing with schema validation.</li>
      <li>Normalised token graphs across formats.</li>
      <li>Deterministic enforcement in code and styles.</li>
    </ul>
  </div>
  <div class="deep-visual">

```txt
$ dtif.validate(tokens.json)
TokenGraph
  colors.brand.primary
  space.scale.200
  typography.body.md
```

  </div>
</div>

</section>

<section class="landing-section landing-deep" aria-labelledby="catch-incoherence">

<div class="deep-grid">
  <div class="deep-copy">
    <h2 id="catch-incoherence">Catch incoherence before UI review</h2>
    <p>
      Linting runs where code changes happen, catching hierarchy, spacing, and component
      usage drift long before screenshots or design reviews.
    </p>
    <ul>
      <li>Flag raw values that bypass your tokens.</li>
      <li>Detect component usage outside approved patterns.</li>
      <li>Fail fast in CI to keep regressions out of production.</li>
    </ul>
  </div>
  <div class="deep-visual">

```txt
Rule: design-system/no-raw-spacing
Status: error
Message: "Use space.scale.200 instead of 14px"
```

  </div>
</div>

</section>

<section class="landing-section landing-deep" aria-labelledby="human-ai">

<div class="deep-grid">
  <div class="deep-copy">
    <h2 id="human-ai">A shared language for humans and agents</h2>
    <p>
      When agents generate UI, the rules become the guardrails. The same constraints that
      guide humans keep machine output aligned at scale.
    </p>
    <ul>
      <li>Rules guide generation toward approved components.</li>
      <li>Linting constrains output to tokenised values.</li>
      <li>Consistency survives high-volume contributions.</li>
    </ul>
  </div>
  <div class="deep-visual">

```txt
agent.output()
  -> tokens enforced
  -> components validated
  -> hierarchy preserved
```

  </div>
</div>

</section>

<section class="landing-section landing-deep" aria-labelledby="extensible">

<div class="deep-grid">
  <div class="deep-copy">
    <h2 id="extensible">Extensible to your organisation</h2>
    <p>
      Extend the rule set to match your naming, patterns, and platform requirements
      without forking the core.
    </p>
    <ul>
      <li>Custom rule packs for org-specific conventions.</li>
      <li>Composable configuration for monorepos.</li>
      <li>Plugin hooks for bespoke validation logic.</li>
    </ul>
  </div>
  <div class="deep-visual">

```json
{
  "rules": {
    "design-system/no-raw-color": "error",
    "acme/typography-scale": "warn"
  }
}
```

  </div>
</div>

</section>

<section class="landing-section landing-trust" aria-labelledby="trust">

<div class="section-header">

## Built for governance, not demos {#trust}

<p class="section-lede">
Engineered for teams who need design authority to scale across codebases.
</p>

</div>

<ul class="trust-list">
  <li>Built for long-lived design systems.</li>
  <li>Designed for CI, not demos.</li>
  <li>Optimised for scale and governance.</li>
</ul>

</section>

<section class="landing-section landing-cta" aria-labelledby="final-cta">

<div class="cta-panel">
  <div>
    <h2 id="final-cta">Design consistency shouldn’t rely on taste or vigilance.</h2>
    <p>Enforce design rules where code is written and reviewed.</p>
  </div>
  <div>
    <a class="cta-button" href="/usage">Start enforcing your design system</a>
  </div>
</div>

</section>

<!-- markdownlint-enable MD033 -->
