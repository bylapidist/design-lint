import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LintDocument } from '../core/document-source.js';

export function createFileDocument(filePath: string): LintDocument {
  const absPath = path.resolve(filePath);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  return {
    id: absPath,
    type: ext,
    async getText() {
      return readFile(absPath, 'utf8');
    },
  };
}
