export interface FileSystem {
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(
    path: string,
    data: string,
    encoding: BufferEncoding,
  ): Promise<void>;
  stat(path: string): Promise<{ mtimeMs: number; size: number }>;
  access(path: string): Promise<void>;
  existsSync(path: string): boolean;
  realpath(path: string): string;
}

export interface PathUtils {
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  isAbsolute(p: string): boolean;
  extname(p: string): string;
  dirname(p: string): string;
  basename(p: string): string;
  sep: string;
}

export interface Logger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface Env {
  fs: FileSystem;
  path: PathUtils;
  logger: Logger;
}
