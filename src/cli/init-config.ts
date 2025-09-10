import fs from 'node:fs';
import path from 'node:path';
import writeFileAtomic from 'write-file-atomic';

const supported = new Set(['json', 'js', 'cjs', 'mjs', 'ts', 'mts']);

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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const pkg: {
            dependencies?: Record<string, unknown>;
            devDependencies?: Record<string, unknown>;
          } = JSON.parse(pkgText);
          if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
            format = 'ts';
          }
        } catch {}
      }
    }
    format ??= 'json';
  }
  return format;
}

export function renderConfigTemplate(format: string): string {
  switch (format) {
    case 'json':
      return `${JSON.stringify({ tokens: {}, rules: {} }, null, 2)}\n`;
    case 'js':
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
  const contents = renderConfigTemplate(format);
  writeFileAtomic.sync(configPath, contents);
  console.log(`Created designlint.config.${format}`);
}
