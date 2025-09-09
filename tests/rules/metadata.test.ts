import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import type { PluginLoader } from '../../src/core/plugin-loader.ts';
import type { PluginModule, RuleModule } from '../../src/core/types.ts';

void test('metadata propagates through report', async () => {
  class MockLoader implements PluginLoader {
    load(
      _p: string,
      _c?: string,
    ): Promise<{ path: string; plugin: PluginModule }> {
      void _p;
      void _c;
      const rule: RuleModule = {
        name: 'mock/rule',
        meta: { description: 'mock rule', category: 'component' },
        create(context) {
          return {
            onNode() {
              context.report({
                message: 'msg',
                line: 1,
                column: 1,
                metadata: { foo: 'bar' },
              });
            },
          };
        },
      };
      return Promise.resolve({ path: 'mock', plugin: { rules: [rule] } });
    }
  }
  const linter = new Linter(
    { plugins: ['mock'], rules: { 'mock/rule': 'error' } },
    { documentSource: new FileSource(), pluginLoader: new MockLoader() },
  );
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages[0]?.metadata?.foo, 'bar');
  assert.equal(res.ruleCategories?.['mock/rule'], 'component');
});
