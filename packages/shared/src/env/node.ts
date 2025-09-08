import fs from 'node:fs';
import path from 'node:path';
import {
  type Env,
  type FileSystem,
  type PathUtils,
  type Logger,
} from './index.js';

export const nodeFileSystem: FileSystem = {
  readFile: (p, enc) => fs.promises.readFile(p, { encoding: enc }),
  writeFile: (p, data, enc) =>
    fs.promises.writeFile(p, data, { encoding: enc }),
  stat: async (p) => {
    const s = await fs.promises.stat(p);
    return { mtimeMs: s.mtimeMs, size: s.size };
  },
  access: (p) => fs.promises.access(p),
  existsSync: (p) => fs.existsSync(p),
  realpath: (p) => fs.realpathSync.native(p),
};

export const nodePathUtils: PathUtils = {
  resolve: (...paths) => path.resolve(...paths),
  join: (...paths) => path.join(...paths),
  relative: (from, to) => path.relative(from, to),
  isAbsolute: (p) => path.isAbsolute(p),
  extname: (p) => path.extname(p),
  dirname: (p) => path.dirname(p),
  basename: (p) => path.basename(p),
  sep: path.sep,
};

export const nodeLogger: Logger = {
  log: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

export const nodeEnv: Env = {
  fs: nodeFileSystem,
  path: nodePathUtils,
  logger: nodeLogger,
};
