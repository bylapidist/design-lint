import fs from 'node:fs';
import path from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { guards } from '../utils/index.js';

const {
  data: { isRecord },
} = guards;

const supported = new Set(['json', 'js', 'cjs', 'mjs', 'ts', 'mts']);

type JsModuleSystem = 'cjs' | 'esm';

export function detectInitFormat(initFormat?: string): string {
  if (initFormat && !supported.has(initFormat)) {
    throw new Error(
      `Unsupported init format: "${initFormat}". Supported formats: ${[...supported].join(', ')}`,
    );
  }
  let format = initFormat;
  if (!format) {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      format = 'ts';
    } else {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkgText = fs.readFileSync(pkgPath, 'utf8');
          const pkgData: unknown = JSON.parse(pkgText);
          if (isRecord(pkgData)) {
            if (
              (isRecord(pkgData.dependencies) &&
                'typescript' in pkgData.dependencies) ||
              (isRecord(pkgData.devDependencies) &&
                'typescript' in pkgData.devDependencies)
            ) {
              format = 'ts';
            }
          }
        } catch {}
      }
    }
    format ??= 'json';
  }
  return format;
}

export function detectJsModuleSystem(cwd = process.cwd()): JsModuleSystem {
  const pkgPath = path.resolve(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return 'cjs';
  }
  try {
    const pkgText = fs.readFileSync(pkgPath, 'utf8');
    const pkgData: unknown = JSON.parse(pkgText);
    if (isRecord(pkgData) && pkgData.type === 'module') {
      return 'esm';
    }
  } catch {}
  return 'cjs';
}

export function renderConfigTemplate(
  format: string,
  options: { jsModuleSystem?: JsModuleSystem } = {},
): string {
  const jsModuleSystem = options.jsModuleSystem ?? 'cjs';
  switch (format) {
    case 'json':
      return `${JSON.stringify({ tokens: {}, rules: {} }, null, 2)}\n`;
    case 'js':
      return jsModuleSystem === 'esm'
        ? `export default {\n  tokens: {},\n  rules: {},\n};\n`
        : `module.exports = {\n  tokens: {},\n  rules: {},\n};\n`;
    case 'cjs':
      return `module.exports = {\n  tokens: {},\n  rules: {},\n};\n`;
    case 'mjs':
      return `export default {\n  tokens: {},\n  rules: {},\n};\n`;
    case 'ts':
    case 'mts':
      return `import { defineConfig } from '@lapidist/design-lint';\n\nexport default defineConfig({\n  tokens: {},\n  rules: {},\n});\n`;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export function initConfig(initFormat?: string) {
  let format: string;
  try {
    format = detectInitFormat(initFormat);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exitCode = 1;
    return;
  }
  const configPath = path.resolve(process.cwd(), `designlint.config.${format}`);
  if (fs.existsSync(configPath)) {
    console.log(`designlint.config.${format} already exists`);
    return;
  }
  const contents = renderConfigTemplate(format, {
    jsModuleSystem: detectJsModuleSystem(),
  });
  writeFileAtomic.sync(configPath, contents);
  console.log(`Created designlint.config.${format}`);
}
