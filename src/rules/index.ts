import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { globby } from 'globby';
import type { RuleModule } from '../core/types.js';
import { isRuleModule } from './utils/is-rule-module.js';

const ruleDir = path.dirname(fileURLToPath(import.meta.url));
const ruleFiles = await globby('*.{ts,js}', {
  cwd: ruleDir,
  ignore: ['index.ts', 'index.js', 'utils/**', '*.d.ts'],
});

const modules = await Promise.all(
  ruleFiles.map(async (file) => {
    const mod: unknown = await import(`./${file.replace(/\.ts$/, '.js')}`);
    let values: unknown[] = [];
    if (typeof mod === 'object' && mod !== null) {
      values = Object.values(mod);
    }
    return values.filter((value): value is RuleModule => isRuleModule(value));
  }),
);

export const builtInRules: RuleModule[] = modules
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name));
