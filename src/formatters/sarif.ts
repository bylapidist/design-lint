import type { LintResult } from '../core/types';

interface SarifLog {
  version: string;
  runs: Array<{
    tool: { driver: { name: string; informationUri: string } };
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
          },
        },
        results: [],
      },
    ],
  };
  for (const res of results) {
    for (const msg of res.messages) {
      sarif.runs[0].results.push({
        ruleId: msg.ruleId,
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
