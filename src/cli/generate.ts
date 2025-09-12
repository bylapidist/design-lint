import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { loadConfig } from '../config/loader.js';
import {
  generateCssVariables,
  generateJsConstants,
  generateTsDeclarations,
} from '../output/index.js';
import { toThemeRecord } from './tokens.js';

interface GenerateCommandOptions {
  config?: string;
  watch?: boolean;
}

export async function generateOutputs(
  options: GenerateCommandOptions,
  logger?: { warn: (msg: string) => void; error: (err: unknown) => void },
) {
  const cwd = process.cwd();

  async function build(): Promise<string | undefined> {
    const config = await loadConfig(cwd, options.config);
    const tokensByTheme = toThemeRecord(config.tokens);
    for (const target of config.output ?? []) {
      const outPath = path.resolve(cwd, target.file);
      const nameTransform = target.nameTransform ?? config.nameTransform;
      let content = '';
      switch (target.format) {
        case 'css':
          content = generateCssVariables(tokensByTheme, {
            nameTransform,
            selectors: target.selectors,
            onWarn: logger?.warn,
          });
          break;
        case 'js':
          content = generateJsConstants(tokensByTheme, {
            nameTransform,
            onWarn: logger?.warn,
          });
          break;
        case 'ts':
          content = generateTsDeclarations(tokensByTheme, {
            nameTransform,
            onWarn: logger?.warn,
          });
          break;
        default:
          continue;
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content);
    }
    return config.configPath;
  }

  const cfgPath = await build();

  if (options.watch) {
    console.log('Watching for changes...');
    const watchPaths = ['**/*.tokens.*'];
    if (cfgPath) watchPaths.push(cfgPath);
    const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });
    const run = () => {
      void build().catch((err: unknown) => {
        if (logger) logger.error(err);
        else {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(msg);
        }
      });
    };
    watcher.on('add', run);
    watcher.on('change', run);
    watcher.on('unlink', run);
  }
}
