import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';

export async function resolveConfigFile(
  cwd: string,
  configPath?: string,
): Promise<{ config: unknown; filepath: string } | null> {
  const explorer = cosmiconfig('designlint', {
    searchPlaces: [
      'package.json',
      'designlint.config.ts',
      'designlint.config.mts',
      'designlint.config.js',
      'designlint.config.mjs',
      'designlint.config.cjs',
      'designlint.config.json',
      '.designlintrc',
      '.designlintrc.json',
      '.designlintrc.yaml',
      '.designlintrc.yml',
      '.designlintrc.js',
      '.designlintrc.cjs',
      '.designlintrc.mjs',
      '.designlintrc.ts',
      '.designlintrc.mts',
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    searchStrategy: 'global',
  });

  if (configPath) {
    const abs = path.resolve(cwd, configPath);
    try {
      await fs.promises.access(abs);
    } catch {
      throw new Error(
        `Config file not found at ${abs}. Run \`npx design-lint init\` to create a config.`,
      );
    }
    return explorer.load(abs);
  }

  return explorer.search(cwd);
}
