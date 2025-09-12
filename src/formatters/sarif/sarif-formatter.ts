/**
 * @packageDocumentation
 *
 * SARIF formatter implementation.
 */

import type { LintResult } from '../../core/types.js';

/**
 * Minimal SARIF log structure used by {@link sarifFormatter}.
 */
interface SarifLog {
  version: string;
  runs: {
    tool: {
      driver: {
        name: string;
        informationUri: string;
        rules: {
          id: string;
          shortDescription: { text: string };
          properties?: { category: string };
        }[];
      };
    };
    results: Record<string, unknown>[];
  }[];
}

/**
 * Convert lint results into a SARIF log.
 *
 * @param results - Linting outcomes to serialize.
 * @param _useColor - Ignored. Present for API parity with other formatters.
 * @returns A JSON string containing a SARIF log.
 *
 * @example
 * ```ts
 * const log = sarifFormatter(results);
 * console.log(log);
 * ```
 */
export function sarifFormatter(
  results: LintResult[],
  _useColor = true,
): string {
  void _useColor;
  const sarif: SarifLog = {
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: '@lapidist/design-lint',
            informationUri: 'https://github.com/bylapidist/design-lint',
            rules: [],
          },
        },
        results: [],
      },
    ],
  };
  const ruleMap = new Map<string, number>();
  const descMap = new Map<string, string>();
  const catMap = new Map<string, string>();
  for (const res of results) {
    if (res.ruleDescriptions) {
      for (const [id, desc] of Object.entries(res.ruleDescriptions)) {
        descMap.set(id, desc);
        const existingIndex = ruleMap.get(id);
        if (existingIndex !== undefined) {
          sarif.runs[0].tool.driver.rules[existingIndex].shortDescription.text =
            desc;
        }
      }
    }
    if (res.ruleCategories) {
      for (const [id, cat] of Object.entries(res.ruleCategories)) {
        catMap.set(id, cat);
        const existingIndex = ruleMap.get(id);
        if (existingIndex !== undefined) {
          sarif.runs[0].tool.driver.rules[existingIndex].properties = {
            category: cat,
          };
        }
      }
    }
    for (const msg of res.messages) {
      const existingIndex = ruleMap.get(msg.ruleId);
      let ruleIndex: number;
      if (existingIndex !== undefined) {
        ruleIndex = existingIndex;
      } else {
        ruleIndex = sarif.runs[0].tool.driver.rules.length;
        ruleMap.set(msg.ruleId, ruleIndex);
        const rule: {
          id: string;
          shortDescription: { text: string };
          properties?: { category: string };
        } = {
          id: msg.ruleId,
          shortDescription: {
            text: descMap.get(msg.ruleId) ?? msg.message,
          },
        };
        const cat = catMap.get(msg.ruleId);
        if (cat) {
          rule.properties = { category: cat };
        }
        sarif.runs[0].tool.driver.rules.push(rule);
      }
      sarif.runs[0].results.push({
        ruleId: msg.ruleId,
        ruleIndex,
        message: { text: msg.message },
        level: msg.severity === 'error' ? 'error' : 'warning',
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: res.sourceId },
              region: { startLine: msg.line, startColumn: msg.column },
            },
          },
        ],
      });
    }
  }
  return JSON.stringify(sarif, null, 2);
}
