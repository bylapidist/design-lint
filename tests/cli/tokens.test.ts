/**
 * Tests for the `design-lint tokens` command.
 *
 * In v8 the DSR kernel is the authoritative token source. These tests
 * require a running kernel at /tmp/designlint-kernel.sock and are skipped
 * automatically in pure unit-test environments.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exportTokens } from '../../src/cli/tokens.js';

const KERNEL_SOCKET = '/tmp/designlint-kernel.sock';
const kernelAvailable = fs.existsSync(KERNEL_SOCKET);

describe(
  'exportTokens — requires DSR kernel',
  { skip: !kernelAvailable },
  () => {
    before(() => {
      assert.ok(
        fs.existsSync(KERNEL_SOCKET),
        'DSR kernel socket must be present for these tests',
      );
    });

    it('exports tokens from the running kernel', async () => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (v: unknown) => {
        lines.push(String(v));
      };
      try {
        await exportTokens({});
      } finally {
        console.log = orig;
      }
      const out = JSON.parse(lines.join('')) as Record<string, unknown>;
      assert.ok(
        Object.keys(out).length > 0,
        'expected at least one theme in output',
      );
    });

    it('throws a clear error when no kernel data is available for an unknown theme', async () => {
      await assert.rejects(
        () => exportTokens({ theme: '__nonexistent_theme__' }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(
            err.message.includes('Unknown theme') ||
              err.message.includes('No token data'),
          );
          return true;
        },
      );
    });
  },
);

describe('exportTokens — no kernel', () => {
  it('throws a descriptive error when the kernel is not running', async () => {
    if (kernelAvailable) {
      // Cannot test the no-kernel path when the kernel is actually running
      return;
    }
    await assert.rejects(
      () => exportTokens({}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes('No token data available from the DSR kernel'),
        );
        return true;
      },
    );
  });
});
