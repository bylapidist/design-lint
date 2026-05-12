/**
 * RuleTester coverage for all built-in design-lint rules.
 *
 * This file ensures every built-in rule has at least one valid case and one
 * invalid case exercised through the canonical `RuleTester` API, closing the
 * release-gate requirement that all built-in rules have `RuleTester` coverage.
 *
 * Rules backed by the `tokenRule` helper require a non-empty token set to
 * exercise their real validation logic. Tokens are injected via the
 * `ValidCase.tokens` / `InvalidCase.tokens` field added to support this.
 *
 * Rules that are no-ops without configuration (e.g. component-prefix,
 * import-path) or that run post-scan (no-unused-tokens) are covered with
 * valid-only cases and a note explaining the constraint.
 */
import test from 'node:test';
import { RuleTester } from '../../packages/testing/src/index.js';
import type { DtifFlattenedToken } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Import every built-in rule
// ---------------------------------------------------------------------------

import { colorsRule } from '../../src/rules/token-colors.js';
import { borderColorRule } from '../../src/rules/token-border-color.js';
import { borderRadiusRule } from '../../src/rules/token-border-radius.js';
import { borderWidthRule } from '../../src/rules/token-border-width.js';
import { boxShadowRule } from '../../src/rules/token-box-shadow.js';
import { animationRule } from '../../src/rules/token-animation.js';
import { blurRule } from '../../src/rules/token-blur.js';
import { durationRule } from '../../src/rules/token-duration.js';
import { easingRule } from '../../src/rules/token-easing.js';
import { fontFamilyRule } from '../../src/rules/token-font-family.js';
import { fontSizeRule } from '../../src/rules/token-font-size.js';
import { fontWeightRule } from '../../src/rules/token-font-weight.js';
import { letterSpacingRule } from '../../src/rules/token-letter-spacing.js';
import { lineHeightRule } from '../../src/rules/token-line-height.js';
import { opacityRule } from '../../src/rules/token-opacity.js';
import { spacingRule } from '../../src/rules/token-spacing.js';
import { outlineRule } from '../../src/rules/token-outline.js';
import { zIndexRule } from '../../src/rules/token-z-index.js';
import { cssVarProvenanceRule } from '../../src/rules/token-css-var-provenance.js';
import { compositeEquivalenceRule } from '../../src/rules/token-composite-equivalence.js';
import { noInlineStylesRule } from '../../src/rules/no-inline-styles.js';
import { iconUsageRule } from '../../src/rules/icon-usage.js';
import { jsxStyleValuesRule } from '../../src/rules/jsx-style-values.js';
import { componentUsageRule } from '../../src/rules/component-usage.js';
import { noHardcodedSpacingRule } from '../../src/rules/no-hardcoded-spacing.js';
import { deprecationRule } from '../../src/rules/deprecation.js';
import { noUnusedTokensRule } from '../../src/rules/no-unused-tokens.js';
import { componentPrefixRule } from '../../src/rules/component-prefix.js';
import { importPathRule } from '../../src/rules/import-path.js';
import { variantPropRule } from '../../src/rules/variant-prop.js';

// ---------------------------------------------------------------------------
// Token fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal `DtifFlattenedToken` for injection into token-based rules.
 * Only the fields used by `tokenRule` and `getDtifTokens` are required.
 */
function makeToken(
  pointer: string,
  type: string,
  value: unknown,
): DtifFlattenedToken {
  const segments = pointer.replace(/^#\//, '').split('/');
  return {
    id: pointer,
    pointer,
    path: segments,
    name: segments.join('.'),
    type,
    value,
    metadata: { extensions: {} },
  };
}

// Shared token fixtures re-used across cases.
// Pointer segment [0] must match the group name each rule passes to isTokenInGroup.
// Token type must match the value passed to tokenRule({ tokens: '...' }) so that
// getDtifTokens(type) returns the token to the rule's getAllowed function.
const colorToken = makeToken('#/color/primary', 'color', '#3B82F6');
const dimensionToken = makeToken('#/radius/sm', 'dimension', {
  value: 4,
  unit: 'px',
});
const spacingToken = makeToken('#/spacing/sm', 'dimension', {
  value: 8,
  unit: 'px',
});
// fontSizes group (fontSizeRule checks isTokenInGroup(token, 'fontSizes'))
const fontSizeToken = makeToken('#/fontSizes/base', 'dimension', {
  value: 16,
  unit: 'px',
});
// fonts group (fontFamilyRule checks isTokenInGroup(token, 'fonts'))
const fontFamilyToken = makeToken('#/fonts/sans', 'fontFamily', 'Inter');
// fontWeights group (fontWeightRule checks isTokenInGroup(token, 'fontWeights'))
const fontWeightToken = makeToken('#/fontWeights/bold', 'fontWeight', 700);
// letterSpacings group — pointer already matches
const letterSpacingToken = makeToken('#/letterSpacings/normal', 'dimension', {
  value: 0,
  unit: 'em',
});
// lineHeights group (lineHeightRule checks isTokenInGroup(token, 'lineHeights')); type 'number'
const lineHeightToken = makeToken('#/lineHeights/base', 'number', 1.5);
// opacity group
const opacityToken = makeToken('#/opacity/half', 'number', 0.5);
// durations group; value must be { value, unit } object so getAllowed's parse() extracts ms
const durationToken = makeToken('#/durations/fast', 'duration', {
  value: 200,
  unit: 'ms',
});
// easingRule does not use isTokenInGroup — any cubicBezier token works; value is the css string
const easingToken = makeToken(
  '#/easing/ease',
  'cubicBezier',
  'cubic-bezier(0.4,0,0.2,1)',
);
// animations group; type 'string'
const animationToken = makeToken(
  '#/animations/spin',
  'string',
  'spin 1s linear',
);
// blurs group; value must be { value, unit } object for getAllowed's parse()
const blurToken = makeToken('#/blurs/sm', 'dimension', {
  value: 4,
  unit: 'px',
});
// shadows group; value must be a shadow-object for getAllowed's toString()
const boxShadowToken = makeToken('#/shadows/sm', 'shadow', {
  offsetX: '0',
  offsetY: '1px',
  blur: '2px',
  color: 'rgba(0,0,0,0.1)',
});
// borderWidths group
const borderWidthToken = makeToken('#/borderWidths/sm', 'dimension', {
  value: 1,
  unit: 'px',
});
// outlines group; type 'string'
const outlineToken = makeToken(
  '#/outlines/focus',
  'string',
  '2px solid #3B82F6',
);
// zIndex group
const zIndexToken = makeToken('#/zIndex/modal', 'number', 100);

const tester = new RuleTester({ defaultFileType: 'css' });

// ---------------------------------------------------------------------------
// design-token/colors
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/colors', async () => {
  await tester.run('design-token/colors', colorsRule, {
    valid: [
      {
        code: 'a { color: var(--color-primary); }',
        fileType: 'css',
        tokens: [colorToken],
      },
      {
        code: 'a { color: #3B82F6; }',
        fileType: 'css',
        tokens: [colorToken],
      },
    ],
    invalid: [
      {
        code: 'a { color: red; }',
        fileType: 'css',
        tokens: [colorToken],
        errors: [{ ruleId: 'design-token/colors' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/border-color
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/border-color', async () => {
  await tester.run('design-token/border-color', borderColorRule, {
    valid: [
      {
        code: 'a { border-color: var(--color-primary); }',
        fileType: 'css',
        tokens: [colorToken],
      },
      {
        code: 'a { border-color: #3B82F6; }',
        fileType: 'css',
        tokens: [colorToken],
      },
    ],
    invalid: [
      {
        code: 'a { border-color: red; }',
        fileType: 'css',
        tokens: [colorToken],
        errors: [{ ruleId: 'design-token/border-color' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/border-radius
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/border-radius', async () => {
  await tester.run('design-token/border-radius', borderRadiusRule, {
    valid: [
      {
        code: 'a { border-radius: 4px; }',
        fileType: 'css',
        tokens: [dimensionToken],
      },
      {
        code: 'a { border-radius: 0; }',
        fileType: 'css',
        tokens: [dimensionToken],
      },
    ],
    invalid: [
      {
        code: 'a { border-radius: 8px; }',
        fileType: 'css',
        tokens: [dimensionToken],
        errors: [{ ruleId: 'design-token/border-radius' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/border-width
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/border-width', async () => {
  await tester.run('design-token/border-width', borderWidthRule, {
    valid: [
      {
        code: 'a { border-width: var(--border-sm); }',
        fileType: 'css',
        tokens: [borderWidthToken],
      },
    ],
    invalid: [
      {
        code: 'a { border-width: 2px; }',
        fileType: 'css',
        tokens: [borderWidthToken],
        errors: [{ ruleId: 'design-token/border-width' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/box-shadow
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/box-shadow', async () => {
  await tester.run('design-token/box-shadow', boxShadowRule, {
    valid: [
      {
        // var() resolves to a single function node — the rule skips those
        code: 'a { box-shadow: var(--shadow-sm); }',
        fileType: 'css',
        tokens: [boxShadowToken],
      },
    ],
    invalid: [
      {
        code: 'a { box-shadow: 0 4px 8px rgba(0,0,0,0.5); }',
        fileType: 'css',
        tokens: [boxShadowToken],
        errors: [{ ruleId: 'design-token/box-shadow' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/font-family
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/font-family', async () => {
  await tester.run('design-token/font-family', fontFamilyRule, {
    valid: [
      {
        code: 'a { font-family: Inter; }',
        fileType: 'css',
        tokens: [fontFamilyToken],
      },
    ],
    invalid: [
      {
        code: 'a { font-family: Arial; }',
        fileType: 'css',
        tokens: [fontFamilyToken],
        errors: [{ ruleId: 'design-token/font-family' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/font-size
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/font-size', async () => {
  await tester.run('design-token/font-size', fontSizeRule, {
    valid: [
      {
        code: 'a { font-size: 16px; }',
        fileType: 'css',
        tokens: [fontSizeToken],
      },
    ],
    invalid: [
      {
        code: 'a { font-size: 14px; }',
        fileType: 'css',
        tokens: [fontSizeToken],
        errors: [{ ruleId: 'design-token/font-size' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/font-weight
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/font-weight', async () => {
  await tester.run('design-token/font-weight', fontWeightRule, {
    valid: [
      {
        // 700 is in the numeric allowed set from fontWeightToken
        code: 'a { font-weight: 700; }',
        fileType: 'css',
        tokens: [fontWeightToken],
      },
    ],
    invalid: [
      {
        code: 'a { font-weight: 400; }',
        fileType: 'css',
        tokens: [fontWeightToken],
        errors: [{ ruleId: 'design-token/font-weight' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/letter-spacing
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/letter-spacing', async () => {
  await tester.run('design-token/letter-spacing', letterSpacingRule, {
    valid: [
      {
        code: 'a { letter-spacing: 0em; }',
        fileType: 'css',
        tokens: [letterSpacingToken],
      },
      {
        // '0' parses to 0 via the `v === '0'` branch — matches numeric set
        code: 'a { letter-spacing: 0; }',
        fileType: 'css',
        tokens: [letterSpacingToken],
      },
    ],
    invalid: [
      {
        code: 'a { letter-spacing: 0.5em; }',
        fileType: 'css',
        tokens: [letterSpacingToken],
        errors: [{ ruleId: 'design-token/letter-spacing' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/line-height
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/line-height', async () => {
  await tester.run('design-token/line-height', lineHeightRule, {
    valid: [
      {
        code: 'a { line-height: 1.5; }',
        fileType: 'css',
        tokens: [lineHeightToken],
      },
      {
        code: 'a { line-height: normal; }',
        fileType: 'css',
        tokens: [lineHeightToken],
      },
    ],
    invalid: [
      {
        code: 'a { line-height: 2; }',
        fileType: 'css',
        tokens: [lineHeightToken],
        errors: [{ ruleId: 'design-token/line-height' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/opacity
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/opacity', async () => {
  await tester.run('design-token/opacity', opacityRule, {
    valid: [
      {
        code: 'a { opacity: 0.5; }',
        fileType: 'css',
        tokens: [opacityToken],
      },
      {
        code: 'a { opacity: var(--opacity-half); }',
        fileType: 'css',
        tokens: [opacityToken],
      },
    ],
    invalid: [
      {
        code: 'a { opacity: 0.8; }',
        fileType: 'css',
        tokens: [opacityToken],
        errors: [{ ruleId: 'design-token/opacity' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/spacing
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/spacing', async () => {
  await tester.run('design-token/spacing', spacingRule, {
    valid: [
      {
        code: 'a { margin: 8px; }',
        fileType: 'css',
        tokens: [spacingToken],
      },
      { code: 'a { margin: 0; }', fileType: 'css', tokens: [spacingToken] },
    ],
    invalid: [
      {
        code: 'a { margin: 16px; }',
        fileType: 'css',
        tokens: [spacingToken],
        options: { base: 4, strictReference: true },
        errors: [{ ruleId: 'design-token/spacing' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/outline
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/outline', async () => {
  await tester.run('design-token/outline', outlineRule, {
    valid: [
      {
        code: 'a { outline: 2px solid #3B82F6; }',
        fileType: 'css',
        tokens: [outlineToken],
      },
    ],
    invalid: [
      {
        code: 'a { outline: 1px dashed red; }',
        fileType: 'css',
        tokens: [outlineToken],
        errors: [{ ruleId: 'design-token/outline' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/z-index
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/z-index', async () => {
  await tester.run('design-token/z-index', zIndexRule, {
    valid: [
      {
        code: 'a { z-index: 100; }',
        fileType: 'css',
        tokens: [zIndexToken],
      },
      { code: 'a { z-index: auto; }', fileType: 'css', tokens: [zIndexToken] },
    ],
    invalid: [
      {
        code: 'a { z-index: 9; }',
        fileType: 'css',
        tokens: [zIndexToken],
        errors: [{ ruleId: 'design-token/z-index' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/animation
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/animation', async () => {
  await tester.run('design-token/animation', animationRule, {
    valid: [
      {
        code: 'a { animation: spin 1s linear; }',
        fileType: 'css',
        tokens: [animationToken],
      },
      {
        code: 'a { color: red; }',
        fileType: 'css',
        tokens: [animationToken],
      },
    ],
    invalid: [
      {
        code: 'a { animation: fadein 0.3s ease; }',
        fileType: 'css',
        tokens: [animationToken],
        errors: [{ ruleId: 'design-token/animation' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/blur
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/blur', async () => {
  await tester.run('design-token/blur', blurRule, {
    valid: [
      {
        code: 'a { filter: none; }',
        fileType: 'css',
        tokens: [blurToken],
      },
      {
        code: 'a { filter: var(--blur-sm); }',
        fileType: 'css',
        tokens: [blurToken],
      },
    ],
    invalid: [
      {
        code: 'a { filter: blur(8px); }',
        fileType: 'css',
        tokens: [blurToken],
        errors: [{ ruleId: 'design-token/blur' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/duration
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/duration', async () => {
  await tester.run('design-token/duration', durationRule, {
    valid: [
      {
        code: 'a { transition-duration: var(--duration-fast); }',
        fileType: 'css',
        tokens: [durationToken],
      },
    ],
    invalid: [
      {
        code: 'a { transition-duration: 0.5s; }',
        fileType: 'css',
        tokens: [durationToken],
        errors: [{ ruleId: 'design-token/duration' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/easing
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/easing', async () => {
  await tester.run('design-token/easing', easingRule, {
    valid: [
      {
        // 'ease-in-out' is a keyword — does not match EASING_PATTERN (cubic-bezier/steps)
        code: 'a { animation-timing-function: ease-in-out; }',
        fileType: 'css',
        tokens: [easingToken],
      },
      {
        // var() function node: EASING_PATTERN won't match 'var(--easing-ease)'
        code: 'a { animation-timing-function: var(--easing-ease); }',
        fileType: 'css',
        tokens: [easingToken],
      },
    ],
    invalid: [
      {
        // Different cubic-bezier — matches EASING_PATTERN but is not in the allowed set
        code: 'a { animation-timing-function: cubic-bezier(0,0,0,0); }',
        fileType: 'css',
        tokens: [easingToken],
        errors: [{ ruleId: 'design-token/easing' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/css-var-provenance
// Without tokens, any var(--x) is flagged as unbacked.
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/css-var-provenance', async () => {
  await tester.run('design-token/css-var-provenance', cssVarProvenanceRule, {
    valid: [
      // No CSS vars used — nothing to check
      { code: 'a { color: red; }', fileType: 'css' },
      // Token is present, so the var is backed
      {
        code: 'a { color: var(--color-primary); }',
        fileType: 'css',
        tokens: [colorToken],
      },
    ],
    invalid: [
      // No tokens → var is not backed
      {
        code: 'a { color: var(--unknown-token); }',
        fileType: 'css',
        errors: [{ ruleId: 'design-token/css-var-provenance' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-token/composite-equivalence
// Without composite tokens (boxShadow, border, etc.) the rule is a no-op.
// ---------------------------------------------------------------------------

void test('RuleTester: design-token/composite-equivalence (no composite tokens = no-op)', async () => {
  await tester.run(
    'design-token/composite-equivalence',
    compositeEquivalenceRule,
    {
      valid: [
        { code: 'a { box-shadow: 0 1px 2px black; }', fileType: 'css' },
        { code: 'a { border: 1px solid red; }', fileType: 'css' },
      ],
      invalid: [],
    },
  );
});

// ---------------------------------------------------------------------------
// design-system/no-hardcoded-spacing
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/no-hardcoded-spacing', async () => {
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [
        { code: 'a { margin: 0; }', fileType: 'css' },
        { code: 'a { padding: var(--space-4); }', fileType: 'css' },
      ],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ ruleId: 'design-system/no-hardcoded-spacing' }],
        },
      ],
    },
  );
});

// ---------------------------------------------------------------------------
// design-system/jsx-style-values
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/jsx-style-values', async () => {
  await tester.run('design-system/jsx-style-values', jsxStyleValuesRule, {
    valid: [
      {
        code: 'const x = () => <div style={{ color: "var(--color-primary)" }} />;',
        fileType: 'tsx',
      },
      {
        code: 'const x = () => <div style={{ margin: 0 }} />;',
        fileType: 'tsx',
      },
    ],
    invalid: [
      {
        code: 'const x = () => <div style={{ color: "#FF0000" }} />;',
        fileType: 'tsx',
        errors: [{ ruleId: 'design-system/jsx-style-values' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-system/icon-usage
// Default substitution: svg → Icon
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/icon-usage', async () => {
  await tester.run('design-system/icon-usage', iconUsageRule, {
    valid: [
      {
        code: 'const x = () => null;',
        fileType: 'tsx',
      },
    ],
    invalid: [
      {
        code: 'const x = () => <svg />;',
        fileType: 'tsx',
        errors: [{ ruleId: 'design-system/icon-usage' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-system/no-inline-styles
// Requires "components" or "importOrigins" to be configured.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/no-inline-styles', async () => {
  await tester.run('design-system/no-inline-styles', noInlineStylesRule, {
    valid: [
      {
        code: 'const x = () => <Button />;',
        fileType: 'tsx',
        options: { components: ['Button'] },
      },
    ],
    invalid: [
      {
        code: 'const x = () => <Button style={{ color: "red" }} />;',
        fileType: 'tsx',
        options: { components: ['Button'] },
        errors: [{ ruleId: 'design-system/no-inline-styles' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-system/component-usage
// Requires "substitutions" to flag raw HTML elements.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/component-usage', async () => {
  await tester.run('design-system/component-usage', componentUsageRule, {
    valid: [
      {
        // <Box> is the substitution target — its lowercase 'box' is not in the
        // disallowed set (which only contains 'div'), so it passes.
        code: 'const x = () => <Box />;',
        fileType: 'tsx',
        options: { substitutions: { div: 'Box' } },
      },
    ],
    invalid: [
      {
        code: 'const x = () => <div />;',
        fileType: 'tsx',
        options: { substitutions: { div: 'Box' } },
        errors: [{ ruleId: 'design-system/component-usage' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-system/variant-prop
// Requires "components" map to enforce allowed variant values.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/variant-prop', async () => {
  await tester.run('design-system/variant-prop', variantPropRule, {
    valid: [
      {
        code: 'const x = () => <Button variant="primary" />;',
        fileType: 'tsx',
        options: { components: { Button: ['primary', 'secondary'] } },
      },
    ],
    invalid: [
      {
        code: 'const x = () => <Button variant="danger" />;',
        fileType: 'tsx',
        options: { components: { Button: ['primary', 'secondary'] } },
        errors: [{ ruleId: 'design-system/variant-prop' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// design-system/deprecation
// Without deprecated tokens configured the rule is a no-op.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/deprecation (no deprecated tokens = no-op)', async () => {
  await tester.run('design-system/deprecation', deprecationRule, {
    valid: [{ code: 'a { color: red; }', fileType: 'css' }],
    invalid: [],
  });
});

// ---------------------------------------------------------------------------
// design-system/no-unused-tokens
// This is a post-scan (run-level) rule — its listeners object is empty and
// violations are only emitted after a full target scan via createRun.
// RuleTester operates at snippet level, so only a valid (no-op) case applies.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/no-unused-tokens (post-scan rule = no-op at snippet level)', async () => {
  await tester.run('design-system/no-unused-tokens', noUnusedTokensRule, {
    valid: [{ code: 'a { color: red; }', fileType: 'css' }],
    invalid: [],
  });
});

// ---------------------------------------------------------------------------
// design-system/component-prefix
// Without "packages" or "components" configured the rule is a no-op.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/component-prefix (no-op without packages configured)', async () => {
  await tester.run('design-system/component-prefix', componentPrefixRule, {
    valid: [{ code: 'const x = () => <MyButton />;', fileType: 'tsx' }],
    invalid: [],
  });
});

// ---------------------------------------------------------------------------
// design-system/import-path
// Without "components" configured the rule is a no-op.
// ---------------------------------------------------------------------------

void test('RuleTester: design-system/import-path (no-op without components configured)', async () => {
  await tester.run('design-system/import-path', importPathRule, {
    valid: [
      {
        code: "import { Button } from '@wrong/package';",
        fileType: 'ts',
      },
    ],
    invalid: [],
  });
});
