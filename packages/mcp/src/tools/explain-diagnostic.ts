import { builtInRules } from '@lapidist/design-lint';
import type { DiagnosticExplanation } from '../types.js';

const DOCS_BASE = 'https://github.com/bylapidist/design-lint/tree/main/docs/rules';

export function handleExplainDiagnostic(ruleId: string): DiagnosticExplanation {
  const rule = builtInRules.find((r) => r.name === ruleId);

  if (!rule) {
    return {
      ruleId,
      description: `Unknown rule: ${ruleId}`,
      rationale: 'This rule is not registered as a built-in rule.',
      fix: 'Check the rule ID and ensure the plugin providing it is loaded.',
    };
  }

  const rationale = rule.meta.rationale?.why ?? rule.meta.description;
  const fixDescription = rule.meta.fixable
    ? `This rule supports automatic ${rule.meta.fixable} fixes. Run design-lint with --fix to apply them.`
    : 'This rule does not support automatic fixes. Address violations manually.';

  return {
    ruleId,
    description: rule.meta.description,
    rationale,
    fix: fixDescription,
    docsUrl: `${DOCS_BASE}/${ruleId.replaceAll('/', '-')}.md`,
  };
}
