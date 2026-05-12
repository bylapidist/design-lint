#!/usr/bin/env node
/**
 * Validates all DTIF JSON examples in documentation markdown files
 * using the actual @lapidist/dtif-parser.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseTokens } from '@lapidist/dtif-parser/parse-tokens';

const REPO_ROOT = new URL('..', import.meta.url).pathname;
const DOCS_ROOT = join(REPO_ROOT, 'docs');

/** Recursively collect all .md files under a directory */
function collectMdFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract all fenced JSON code blocks from markdown text.
 * Returns { code, lineStart } objects.
 */
function extractJsonBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let inBlock = false;
  let fence = null;
  let blockLines = [];
  let lineStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const m = /^(`{3,}|~{3,})(json|jsonc)?\s*$/.exec(line);
      if (m && (m[2] === 'json' || m[2] === 'jsonc')) {
        inBlock = true;
        fence = m[1];
        blockLines = [];
        lineStart = i + 1;
      }
    } else {
      if (line.startsWith(fence) && line.trim() === fence) {
        blocks.push({ code: blockLines.join('\n'), lineStart });
        inBlock = false;
        fence = null;
        blockLines = [];
      } else {
        blockLines.push(line);
      }
    }
  }
  return blocks;
}

/** Heuristic: is this JSON block a DTIF catalog? */
function isDtifCatalog(json) {
  return (
    Object.prototype.hasOwnProperty.call(json, '$version') &&
    Object.values(json).some(
      (v) =>
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        Object.values(v).some(
          (token) =>
            token !== null &&
            typeof token === 'object' &&
            Object.prototype.hasOwnProperty.call(token, '$type'),
        ),
    )
  );
}

async function validateBlock(code, filePath, lineStart) {
  let json;
  try {
    json = JSON.parse(code);
  } catch {
    return null; // not valid JSON — cannot be DTIF, skip silently
  }

  if (!isDtifCatalog(json)) {
    return null; // not a DTIF catalog — skip
  }

  const result = await parseTokens({ data: json });
  // Only report errors, not warnings.
  // Warnings for unknown types (string, number, cubicBezier, fontFamily, fontWeight)
  // are expected for design-lint-specific DTIF extensions.
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  return errors.length > 0 ? errors : null;
}

async function main() {
  const files = collectMdFiles(DOCS_ROOT);
  const issues = [];

  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8');
    const blocks = extractJsonBlocks(text);

    for (const { code, lineStart } of blocks) {
      const errors = await validateBlock(code, filePath, lineStart);
      if (errors && errors.length > 0) {
        issues.push({ filePath, lineStart, errors, code });
      }
    }
  }

  if (issues.length === 0) {
    console.log('✓ All DTIF examples in docs passed parser validation.');
    process.exit(0);
  }

  console.error(`✗ Found ${issues.length} DTIF example(s) with parser errors:\n`);
  for (const { filePath, lineStart, errors, code } of issues) {
    const rel = relative(REPO_ROOT, filePath);
    console.error(`--- ${rel} (block at line ~${lineStart}) ---`);
    console.error('Block:');
    console.error(code);
    console.error('Diagnostics:');
    for (const e of errors) {
      console.error(`  [${e.severity}] ${e.message}${e.pointer ? ` at ${e.pointer}` : ''}`);
    }
    console.error('');
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
