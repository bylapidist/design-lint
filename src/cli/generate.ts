/**
 * @packageDocumentation
 *
 * CLI command for generating token outputs.
 */

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { loadConfig } from '../config/loader.js';
import {
  generateCssVariables,
  generateJsConstants,
  generateTsDeclarations,
} from '../output/index.js';
import { TOKEN_FILE_GLOB, toThemeRecord } from '../utils/tokens/index.js';

/**
 * Options for the `generate` CLI command.
 *
 * Controls configuration file resolution and watch mode behavior.
 */
interface GenerateCommandOptions {
  /** Optional path to a configuration file. */
  config?: string;
  /** Whether to watch token files and regenerate on change. */
  watch?: boolean;
}

/**
 * Generate token outputs in configured formats.
 *
 * Resolves the user's configuration, builds each declared output target, and
 * optionally watches token files and the config file to regenerate on changes.
 *
 * @param options - Command options controlling config path and watch mode.
 * @param logger - Optional logger for warnings and errors during generation.
 */
export async function generateOutputs(
  options: GenerateCommandOptions,
  logger?: { warn: (msg: string) => void; error: (err: unknown) => void },
): Promise<void> {
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
          content = await generateCssVariables(tokensByTheme, {
            nameTransform,
            selectors: target.selectors,
            onWarn: logger?.warn,
          });
          break;
        case 'js':
          content = await generateJsConstants(tokensByTheme, {
            nameTransform,
            onWarn: logger?.warn,
          });
          break;
        case 'ts':
          content = await generateTsDeclarations(tokensByTheme, {
            nameTransform,
            onWarn: logger?.warn,
          });
          break;
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content);
    }
    return config.configPath;
  }

  const cfgPath = await build();

  if (options.watch) {
    console.log('Watching for changes...');
    const watchPaths = [TOKEN_FILE_GLOB];
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
