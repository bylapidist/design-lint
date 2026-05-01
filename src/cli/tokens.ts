import fs from 'fs';
import path from 'path';
import type { DtifFlattenedToken } from '../core/types.js';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens } from '../utils/tokens/index.js';
import { tryFetchKernelData } from './kernel-client.js';

/**
 * Options for the `tokens` CLI command.
 */
interface TokensCommandOptions {
  theme?: string;
  out?: string;
  config?: string;
}

/**
 * Export flattened design tokens as JSON from the DSR kernel.
 *
 * In v8 the authoritative token source is the running DSR kernel. The kernel
 * must be started before invoking this command.
 */
export async function exportTokens(
  options: TokensCommandOptions,
): Promise<void> {
  const config = await loadConfig(process.cwd(), options.config);
  const kernelData = await tryFetchKernelData();

  if (kernelData === null || kernelData.tokenEntries.size === 0) {
    throw new Error(
      'No token data available from the DSR kernel. ' +
        'Start the kernel first with `design-lint kernel start --config <config>`.',
    );
  }

  const emptyPath: readonly string[] = Object.freeze([]);
  const defaultTokens: DtifFlattenedToken[] = Array.from(
    kernelData.tokenEntries.values(),
  ).map((t) => ({
    id: t.pointer,
    pointer: t.pointer,
    name: t.name,
    path: emptyPath,
    metadata: { extensions: {} },
    ...(t.type !== undefined ? { type: t.type } : {}),
  }));

  const tokensByTheme: Record<string, DtifFlattenedToken[]> = {
    default: defaultTokens,
  };

  if (options.theme !== undefined && !(options.theme in tokensByTheme)) {
    const available = Object.keys(tokensByTheme).sort();
    const details =
      available.length > 0
        ? ` Available themes: ${available.join(', ')}.`
        : ' No themes are configured.';
    throw new Error(`Unknown theme "${options.theme}".${details}`);
  }

  const themes =
    options.theme !== undefined ? [options.theme] : Object.keys(tokensByTheme);
  const output: Record<string, Record<string, DtifFlattenedToken>> = {};

  for (const theme of themes) {
    const dtifTokens = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform: config.nameTransform,
    });
    const themeOutput: Record<string, DtifFlattenedToken> = {};
    for (const token of dtifTokens) {
      themeOutput[token.pointer] = token;
    }
    output[theme] = themeOutput;
  }

  const json = JSON.stringify(output, null, 2);
  if (options.out !== undefined) {
    const filePath = path.resolve(process.cwd(), options.out);
    fs.writeFileSync(filePath, json);
  } else {
    console.log(json);
  }
}
