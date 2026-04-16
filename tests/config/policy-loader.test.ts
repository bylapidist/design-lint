/**
 * Unit tests for policy-loader and policy-enforcer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadPolicy } from '../../src/config/policy-loader.js';
import { enforcePolicy } from '../../src/config/policy-enforcer.js';
import type { Config } from '../../src/core/linter.js';
import type { DesignLintPolicy } from '../../src/core/types.js';
import { ConfigError } from '../../src/core/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'design-lint-policy-test-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    rules: {},
    targets: [],
    format: 'stylish',
    ...overrides,
  } as Config;
}

function basePolicy(
  overrides: Partial<DesignLintPolicy> = {},
): DesignLintPolicy {
  return {
    requiredRules: [],
    minSeverity: {},
    tokenCoverage: {},
    ratchet: { mode: 'entropy' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// loadPolicy — file not found
// ---------------------------------------------------------------------------

test('loadPolicy returns undefined when no policy file exists', () => {
  const dir = makeTmpDir();
  const result = loadPolicy(dir);
  assert.equal(result, undefined);
});

// ---------------------------------------------------------------------------
// loadPolicy — basic load
// ---------------------------------------------------------------------------

test('loadPolicy loads a simple policy file', () => {
  const dir = makeTmpDir();
  writeJson(path.join(dir, 'designlint.policy.json'), {
    requiredRules: ['color/no-raw-value'],
    minSeverity: { 'color/no-raw-value': 'error' },
    tokenCoverage: { color: 0.8 },
  });

  const policy = loadPolicy(dir);
  assert.ok(policy !== undefined);
  assert.deepEqual(policy.requiredRules, ['color/no-raw-value']);
  assert.equal(policy.minSeverity['color/no-raw-value'], 'error');
  assert.equal(policy.tokenCoverage.color, 0.8);
});

// ---------------------------------------------------------------------------
// loadPolicy — upward search
// ---------------------------------------------------------------------------

test('loadPolicy finds policy file in ancestor directory', () => {
  const root = makeTmpDir();
  const child = path.join(root, 'packages', 'my-app');
  fs.mkdirSync(child, { recursive: true });

  writeJson(path.join(root, 'designlint.policy.json'), {
    requiredRules: ['spacing/token-required'],
  });

  const policy = loadPolicy(child);
  assert.ok(policy !== undefined);
  assert.deepEqual(policy.requiredRules, ['spacing/token-required']);
});

// ---------------------------------------------------------------------------
// loadPolicy — invalid JSON
// ---------------------------------------------------------------------------

test('loadPolicy throws ConfigError for invalid JSON', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.policy.json'),
    '{bad json}',
    'utf8',
  );

  assert.throws(() => loadPolicy(dir), ConfigError);
});

// ---------------------------------------------------------------------------
// loadPolicy — schema validation failure
// ---------------------------------------------------------------------------

test('loadPolicy throws ConfigError for invalid policy shape', () => {
  const dir = makeTmpDir();
  writeJson(path.join(dir, 'designlint.policy.json'), {
    requiredRules: 'not-an-array',
  });

  assert.throws(() => loadPolicy(dir), ConfigError);
});

// ---------------------------------------------------------------------------
// loadPolicy — extends
// ---------------------------------------------------------------------------

test('loadPolicy merges extends policies', () => {
  const root = makeTmpDir();
  const baseDir = path.join(root, 'base');
  fs.mkdirSync(baseDir);

  writeJson(path.join(baseDir, 'base.policy.json'), {
    requiredRules: ['color/no-raw-value'],
    minSeverity: { 'color/no-raw-value': 'warn' },
    tokenCoverage: { color: 0.5 },
  });

  writeJson(path.join(root, 'designlint.policy.json'), {
    extends: ['./base/base.policy.json'],
    requiredRules: ['spacing/token-required'],
    minSeverity: { 'color/no-raw-value': 'error' },
    tokenCoverage: { color: 0.8 },
  });

  const policy = loadPolicy(root);
  assert.ok(policy !== undefined);
  // merged requiredRules from both
  assert.ok(policy.requiredRules.includes('color/no-raw-value'));
  assert.ok(policy.requiredRules.includes('spacing/token-required'));
  // higher severity wins
  assert.equal(policy.minSeverity['color/no-raw-value'], 'error');
  // higher coverage ratio wins
  assert.equal(policy.tokenCoverage.color, 0.8);
});

test('loadPolicy higher-severity base wins over override warn', () => {
  const root = makeTmpDir();
  const baseDir = path.join(root, 'base');
  fs.mkdirSync(baseDir);

  writeJson(path.join(baseDir, 'base.policy.json'), {
    minSeverity: { 'color/no-raw-value': 'error' },
  });

  writeJson(path.join(root, 'designlint.policy.json'), {
    extends: ['./base/base.policy.json'],
    minSeverity: { 'color/no-raw-value': 'warn' },
  });

  const policy = loadPolicy(root);
  assert.ok(policy !== undefined);
  // error > warn — error should win
  assert.equal(policy.minSeverity['color/no-raw-value'], 'error');
});

// ---------------------------------------------------------------------------
// loadPolicy — circular extends detection
// ---------------------------------------------------------------------------

test('loadPolicy throws ConfigError on circular extends', () => {
  const dir = makeTmpDir();

  writeJson(path.join(dir, 'a.policy.json'), {
    extends: ['./b.policy.json'],
  });
  writeJson(path.join(dir, 'b.policy.json'), {
    extends: ['./a.policy.json'],
  });
  writeJson(path.join(dir, 'designlint.policy.json'), {
    extends: ['./a.policy.json'],
  });

  assert.throws(() => loadPolicy(dir), ConfigError);
});

// ---------------------------------------------------------------------------
// enforcePolicy — required rules
// ---------------------------------------------------------------------------

test('enforcePolicy passes when required rule is enabled', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'error' } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy passes when required rule has warn severity', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'warn' } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy throws when required rule is missing', () => {
  const config = baseConfig({ rules: {} });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.throws(() => {
    enforcePolicy(config, policy);
  }, ConfigError);
});

test('enforcePolicy throws when required rule is off', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'off' } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.throws(() => {
    enforcePolicy(config, policy);
  }, ConfigError);
});

test('enforcePolicy throws when required rule is numeric 0', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 0 } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.throws(() => {
    enforcePolicy(config, policy);
  }, ConfigError);
});

test('enforcePolicy passes when required rule is numeric 1', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 1 } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy passes when required rule is numeric 2', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 2 } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy passes when required rule is a tuple', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': ['error', {}] } });
  const policy = basePolicy({ requiredRules: ['color/no-raw-value'] });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

// ---------------------------------------------------------------------------
// enforcePolicy — minSeverity
// ---------------------------------------------------------------------------

test('enforcePolicy passes when rule severity meets minimum', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'error' } });
  const policy = basePolicy({ minSeverity: { 'color/no-raw-value': 'warn' } });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy passes when rule severity exactly equals minimum', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'warn' } });
  const policy = basePolicy({ minSeverity: { 'color/no-raw-value': 'warn' } });
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

test('enforcePolicy throws when rule severity is below minimum', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'warn' } });
  const policy = basePolicy({ minSeverity: { 'color/no-raw-value': 'error' } });
  assert.throws(() => {
    enforcePolicy(config, policy);
  }, ConfigError);
});

test('enforcePolicy throws when rule is off but has minSeverity constraint', () => {
  const config = baseConfig({ rules: { 'color/no-raw-value': 'off' } });
  const policy = basePolicy({ minSeverity: { 'color/no-raw-value': 'error' } });
  assert.throws(() => {
    enforcePolicy(config, policy);
  }, ConfigError);
});

test('enforcePolicy skips minSeverity check when rule is not configured', () => {
  const config = baseConfig({ rules: {} });
  const policy = basePolicy({ minSeverity: { 'color/no-raw-value': 'error' } });
  // rule not configured at all — policy only mandates minimum if it's set
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});

// ---------------------------------------------------------------------------
// enforcePolicy — no rules on config
// ---------------------------------------------------------------------------

test('enforcePolicy handles config with undefined rules', () => {
  const config = { targets: [], format: 'stylish' } as unknown as Config;
  const policy = basePolicy();
  assert.doesNotThrow(() => {
    enforcePolicy(config, policy);
  });
});
