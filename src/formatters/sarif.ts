import type { LintResult } from '../core/types.js';

interface SarifLog {
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        informationUri: string;
        rules: Array<{ id: string; shortDescription: { text: string } }>;
      };
    };
    results: Array<Record<string, unknown>>;
  }>;
}

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
  for (const res of results) {
    if (res.ruleDescriptions) {
      for (const [id, desc] of Object.entries(res.ruleDescriptions)) {
        if (!descMap.has(id)) descMap.set(id, desc);
      }
    }
    for (const msg of res.messages) {
      let ruleIndex: number;
      if (ruleMap.has(msg.ruleId)) {
        ruleIndex = ruleMap.get(msg.ruleId)!;
      } else {
        ruleIndex = sarif.runs[0].tool.driver.rules.length;
        ruleMap.set(msg.ruleId, ruleIndex);
        sarif.runs[0].tool.driver.rules.push({
          id: msg.ruleId,
          shortDescription: {
            text: descMap.get(msg.ruleId) ?? msg.message,
          },
        });
      }
      sarif.runs[0].results.push({
        ruleId: msg.ruleId,
        ruleIndex,
        message: { text: msg.message },
        level: msg.severity === 'error' ? 'error' : 'warning',
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: res.filePath },
              region: { startLine: msg.line, startColumn: msg.column },
            },
          },
        ],
      });
    }
  }
  return JSON.stringify(sarif, null, 2);
}
