import { Linter } from '../../src/core/engine';

describe('design-token/colors rule', () => {
  it('reports disallowed colors', async () => {
    const linter = new Linter({
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    });
    const result = await linter.lintText('const a = "#000000";', 'test.ts');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].ruleId).toBe('design-token/colors');
  });
});
