/**
 * Tests for @lapidist/design-lint-telemetry SDK.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDLTSStream,
  validateDLTSEvent,
  aggregateRunEvents,
  computeEntropyTrend,
  filterByAgent,
  groupByRule,
  createOtelInstrumentation,
} from '../packages/telemetry/src/sdk.js';
import type {
  DLTSEnvelope,
  RunEvent,
  EntropyEvent,
  DiagnosticEvent,
  FixEvent,
  CorrectionEvent,
  KernelMutationEvent,
  OtelTracer,
  OtelSpan,
  OtelMeter,
} from '../packages/telemetry/src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvelope(overrides: Partial<DLTSEnvelope> = {}): DLTSEnvelope {
  return {
    $schema: 'https://design-lint.lapidist.net/schema/dlts/v1.json',
    specVersion: '1.0.0',
    eventType: 'RunEvent',
    timestamp: '2026-04-12T00:00:00.000Z',
    runId: 'run-1',
    kernelSnapshotHash: 'abc123',
    ...overrides,
  };
}

function makeRunEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    ...makeEnvelope({ eventType: 'RunEvent' }),
    eventType: 'RunEvent',
    filesScanned: 10,
    durationMs: 100,
    totalDiagnostics: 5,
    errorCount: 3,
    warnCount: 2,
    ...overrides,
  };
}

function makeEntropyEvent(overall: number, timestamp: string): EntropyEvent {
  return {
    ...makeEnvelope({ eventType: 'EntropyEvent', timestamp }),
    eventType: 'EntropyEvent',
    score: {
      overall,
      byCategory: {},
      components: {
        tokenCoverageRatio: 0.8,
        violationRecurrenceRate: 0.1,
        agentAttributionRatio: 0.3,
        rateOfChange: 0.05,
        violationConcentration: 0.2,
      },
    },
  };
}

function makeDiagnosticEvent(
  ruleId: string,
  overrides: Partial<DiagnosticEvent> = {},
): DiagnosticEvent {
  return {
    ...makeEnvelope({ eventType: 'DiagnosticEvent' }),
    eventType: 'DiagnosticEvent',
    ruleId,
    severity: 'error',
    message: `Violation of ${ruleId}`,
    file: 'src/App.tsx',
    line: 1,
    column: 1,
    ...overrides,
  };
}

function makeFixEvent(overrides: Partial<FixEvent> = {}): FixEvent {
  return {
    ...makeEnvelope({ eventType: 'FixEvent' }),
    eventType: 'FixEvent',
    ruleId: 'design-token/colors',
    file: 'src/App.tsx',
    line: 5,
    column: 3,
    before: 'color: red',
    after: 'color: var(--color-brand)',
    ...overrides,
  };
}

function makeCorrectionEvent(
  overrides: Partial<CorrectionEvent> = {},
): CorrectionEvent {
  return {
    ...makeEnvelope({ eventType: 'CorrectionEvent' }),
    eventType: 'CorrectionEvent',
    agentId: 'agent-1',
    iterationsUsed: 2,
    converged: true,
    violationsRemaining: 0,
    ...overrides,
  };
}

function makeKernelMutationEvent(
  overrides: Partial<KernelMutationEvent> = {},
): KernelMutationEvent {
  return {
    ...makeEnvelope({ eventType: 'KernelMutationEvent' }),
    eventType: 'KernelMutationEvent',
    mutationType: 'add',
    pointer: '#/color/brand',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseDLTSStream
// ---------------------------------------------------------------------------

void test('parseDLTSStream parses newline-delimited JSON', () => {
  const env1 = makeEnvelope({ runId: 'r1' });
  const env2 = makeEnvelope({ runId: 'r2' });
  const ndjson = `${JSON.stringify(env1)}\n${JSON.stringify(env2)}`;
  const result = parseDLTSStream(ndjson);
  assert.equal(result.length, 2);
  assert.equal(result[0].runId, 'r1');
  assert.equal(result[1].runId, 'r2');
});

void test('parseDLTSStream ignores blank lines', () => {
  const env = makeEnvelope({ runId: 'r1' });
  const ndjson = `\n${JSON.stringify(env)}\n\n`;
  const result = parseDLTSStream(ndjson);
  assert.equal(result.length, 1);
});

void test('parseDLTSStream returns empty array for empty string', () => {
  assert.deepEqual(parseDLTSStream(''), []);
});

void test('parseDLTSStream returns empty array for whitespace-only string', () => {
  assert.deepEqual(parseDLTSStream('   \n   \n'), []);
});

// ---------------------------------------------------------------------------
// validateDLTSEvent
// ---------------------------------------------------------------------------

void test('validateDLTSEvent returns valid for a conforming envelope', () => {
  const result = validateDLTSEvent(makeEnvelope());
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

void test('validateDLTSEvent rejects null', () => {
  const result = validateDLTSEvent(null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

void test('validateDLTSEvent rejects a non-object primitive', () => {
  const result = validateDLTSEvent('not-an-object');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

void test('validateDLTSEvent reports missing specVersion', () => {
  const env = makeEnvelope();
  const partial: Record<string, unknown> = { ...env };
  delete partial.specVersion;
  const result = validateDLTSEvent(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('specVersion')));
});

void test('validateDLTSEvent reports missing eventType', () => {
  const env = makeEnvelope();
  const partial: Record<string, unknown> = { ...env };
  delete partial.eventType;
  const result = validateDLTSEvent(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('eventType')));
});

void test('validateDLTSEvent reports missing timestamp', () => {
  const env = makeEnvelope();
  const partial: Record<string, unknown> = { ...env };
  delete partial.timestamp;
  const result = validateDLTSEvent(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('timestamp')));
});

void test('validateDLTSEvent reports missing runId', () => {
  const env = makeEnvelope();
  const partial: Record<string, unknown> = { ...env };
  delete partial.runId;
  const result = validateDLTSEvent(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('runId')));
});

void test('validateDLTSEvent reports missing kernelSnapshotHash', () => {
  const env = makeEnvelope();
  const partial: Record<string, unknown> = { ...env };
  delete partial.kernelSnapshotHash;
  const result = validateDLTSEvent(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('kernelSnapshotHash')));
});

void test('validateDLTSEvent accumulates multiple errors', () => {
  const result = validateDLTSEvent({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 4);
});

// ---------------------------------------------------------------------------
// aggregateRunEvents
// ---------------------------------------------------------------------------

void test('aggregateRunEvents returns zeros for empty array', () => {
  const report = aggregateRunEvents([]);
  assert.deepEqual(report, {
    totalRuns: 0,
    totalFilesScanned: 0,
    totalDiagnostics: 0,
    averageDurationMs: 0,
  });
});

void test('aggregateRunEvents sums fields across events', () => {
  const events: RunEvent[] = [
    makeRunEvent({ filesScanned: 10, durationMs: 100, totalDiagnostics: 5 }),
    makeRunEvent({ filesScanned: 20, durationMs: 200, totalDiagnostics: 3 }),
  ];
  const report = aggregateRunEvents(events);
  assert.equal(report.totalRuns, 2);
  assert.equal(report.totalFilesScanned, 30);
  assert.equal(report.totalDiagnostics, 8);
  assert.equal(report.averageDurationMs, 150);
});

void test('aggregateRunEvents computes average duration correctly for a single event', () => {
  const report = aggregateRunEvents([makeRunEvent({ durationMs: 250 })]);
  assert.equal(report.averageDurationMs, 250);
});

// ---------------------------------------------------------------------------
// computeEntropyTrend
// ---------------------------------------------------------------------------

void test('computeEntropyTrend returns zero delta for a single event', () => {
  const events = [makeEntropyEvent(75, '2026-04-12T00:00:00.000Z')];
  const trend = computeEntropyTrend(events, 10);
  assert.equal(trend.delta, 0);
  assert.equal(trend.points.length, 1);
});

void test('computeEntropyTrend computes delta between first and last window point', () => {
  const events = [
    makeEntropyEvent(50, '2026-04-12T00:00:00.000Z'),
    makeEntropyEvent(60, '2026-04-12T01:00:00.000Z'),
    makeEntropyEvent(70, '2026-04-12T02:00:00.000Z'),
  ];
  const trend = computeEntropyTrend(events, 3);
  assert.equal(trend.delta, 20);
  assert.equal(trend.windowSize, 3);
  assert.equal(trend.points.length, 3);
});

void test('computeEntropyTrend trims to window size', () => {
  const events = [
    makeEntropyEvent(10, '2026-04-12T00:00:00.000Z'),
    makeEntropyEvent(20, '2026-04-12T01:00:00.000Z'),
    makeEntropyEvent(30, '2026-04-12T02:00:00.000Z'),
    makeEntropyEvent(40, '2026-04-12T03:00:00.000Z'),
    makeEntropyEvent(50, '2026-04-12T04:00:00.000Z'),
  ];
  const trend = computeEntropyTrend(events, 3);
  assert.equal(trend.points.length, 3);
  assert.equal(trend.delta, 20); // 50 - 30
});

void test('computeEntropyTrend returns zero delta for empty events', () => {
  const trend = computeEntropyTrend([], 5);
  assert.equal(trend.delta, 0);
  assert.equal(trend.points.length, 0);
});

// ---------------------------------------------------------------------------
// filterByAgent
// ---------------------------------------------------------------------------

void test('filterByAgent returns only events matching the agentId', () => {
  const a1 = makeEnvelope({ agentId: 'agent-a' });
  const a2 = makeEnvelope({ agentId: 'agent-b' });
  const a3 = makeEnvelope({ agentId: 'agent-a' });
  const result = filterByAgent([a1, a2, a3], 'agent-a');
  assert.equal(result.length, 2);
  assert.ok(result.every((e) => e.agentId === 'agent-a'));
});

void test('filterByAgent returns empty array when no events match', () => {
  const events = [makeEnvelope({ agentId: 'agent-x' })];
  assert.deepEqual(filterByAgent(events, 'agent-z'), []);
});

void test('filterByAgent returns empty array for empty input', () => {
  assert.deepEqual(filterByAgent([], 'agent-a'), []);
});

// ---------------------------------------------------------------------------
// groupByRule
// ---------------------------------------------------------------------------

void test('groupByRule groups events by ruleId', () => {
  const events: DiagnosticEvent[] = [
    makeDiagnosticEvent('design-system/no-inline-styles'),
    makeDiagnosticEvent('design-token/spacing'),
    makeDiagnosticEvent('design-system/no-inline-styles'),
  ];
  const groups = groupByRule(events);
  assert.equal(groups['design-system/no-inline-styles'].length, 2);
  assert.equal(groups['design-token/spacing'].length, 1);
});

void test('groupByRule returns empty object for empty input', () => {
  assert.deepEqual(groupByRule([]), {});
});

void test('groupByRule creates separate bucket per unique rule', () => {
  const rules = ['rule-a', 'rule-b', 'rule-c'];
  const events = rules.map((r) => makeDiagnosticEvent(r));
  const groups = groupByRule(events);
  for (const rule of rules) {
    assert.ok(rule in groups);
    assert.equal(groups[rule].length, 1);
  }
});

// ---------------------------------------------------------------------------
// createOtelInstrumentation
// ---------------------------------------------------------------------------

interface SpanRecord {
  name: string;
  attrs: Record<string, string | number | boolean>;
  events: {
    name: string;
    attributes: Record<string, string | number | boolean>;
  }[];
  ended: boolean;
}

interface GaugeRecord {
  name: string;
  value: number;
  attributes: Record<string, string | number | boolean>;
}

function makeTracerAndSpans(): {
  tracer: OtelTracer;
  meter: OtelMeter;
  spans: SpanRecord[];
  gauges: GaugeRecord[];
} {
  const spans: SpanRecord[] = [];
  const gauges: GaugeRecord[] = [];

  const mockSpan: OtelSpan = {
    end() {
      spans[spans.length - 1].ended = true;
    },
    setAttribute(key, value) {
      spans[spans.length - 1].attrs[key] = value;
    },
    recordException() {
      // no-op in test
    },
    addEvent(name, attributes = {}) {
      spans[spans.length - 1].events.push({ name, attributes });
    },
  };

  const tracer: OtelTracer = {
    startSpan(name) {
      spans.push({ name, attrs: {}, events: [], ended: false });
      return mockSpan;
    },
  };

  const meter: OtelMeter = {
    createObservableGauge(name) {
      return {
        record(value, attributes = {}) {
          gauges.push({ name, value, attributes });
        },
      };
    },
  };

  return { tracer, meter, spans, gauges };
}

void test('createOtelInstrumentation.recordRun starts and ends a span', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordRun(
    makeRunEvent({
      runId: 'run-42',
      filesScanned: 7,
      durationMs: 300,
      totalDiagnostics: 2,
    }),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.run');
  assert.equal(spans[0].attrs.runId, 'run-42');
  assert.equal(spans[0].attrs.filesScanned, 7);
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.recordEntropy starts and ends a span', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordEntropy(
    makeEntropyEvent(80, '2026-04-12T00:00:00.000Z'),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.entropy');
  assert.equal(spans[0].attrs.overall, 80);
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.shutdown resolves without error', async () => {
  const { tracer, meter } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  await assert.doesNotReject(instrumentation.shutdown());
});

// ---------------------------------------------------------------------------
// createOtelInstrumentation — new event types
// ---------------------------------------------------------------------------

void test('createOtelInstrumentation.recordDiagnostic creates a span with rule attributes', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordDiagnostic(
    makeDiagnosticEvent('design-token/colors', {
      severity: 'warn',
      line: 10,
      column: 5,
    }),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.diagnostic');
  assert.equal(spans[0].attrs.ruleId, 'design-token/colors');
  assert.equal(spans[0].attrs.severity, 'warn');
  assert.equal(spans[0].attrs.line, 10);
  assert.equal(spans[0].attrs.column, 5);
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.recordFix creates a span with addEvent for before/after', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordFix(
    makeFixEvent({ before: 'color: red', after: 'color: var(--color-brand)' }),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.fix');
  assert.equal(spans[0].events.length, 1);
  assert.equal(spans[0].events[0].name, 'fix.applied');
  assert.equal(spans[0].events[0].attributes.before, 'color: red');
  assert.equal(
    spans[0].events[0].attributes.after,
    'color: var(--color-brand)',
  );
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.recordCorrection creates a span with convergence metadata', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordCorrection(
    makeCorrectionEvent({
      converged: false,
      iterationsUsed: 3,
      violationsRemaining: 2,
    }),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.correction');
  assert.equal(spans[0].events.length, 1);
  assert.equal(spans[0].events[0].name, 'correction.cycle');
  assert.equal(spans[0].events[0].attributes.converged, false);
  assert.equal(spans[0].events[0].attributes.iterationsUsed, 3);
  assert.equal(spans[0].events[0].attributes.violationsRemaining, 2);
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.recordKernelMutation creates a span with mutation details', () => {
  const { tracer, meter, spans } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordKernelMutation(
    makeKernelMutationEvent({
      mutationType: 'deprecate',
      pointer: '#/color/old',
    }),
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'design-lint.kernel-mutation');
  assert.equal(spans[0].events.length, 1);
  assert.equal(spans[0].events[0].name, 'kernel.mutation');
  assert.equal(spans[0].events[0].attributes.mutationType, 'deprecate');
  assert.equal(spans[0].events[0].attributes.pointer, '#/color/old');
  assert.equal(spans[0].ended, true);
});

void test('createOtelInstrumentation.recordEntropy records gauge metrics for all components', () => {
  const { tracer, meter, gauges } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordEntropy(
    makeEntropyEvent(75, '2026-04-12T00:00:00.000Z'),
  );

  const gaugeNames = gauges.map((g) => g.name);
  assert.ok(gaugeNames.includes('design-lint.entropy.overall'));
  assert.ok(gaugeNames.includes('design-lint.entropy.tokenCoverageRatio'));
  assert.ok(gaugeNames.includes('design-lint.entropy.violationRecurrenceRate'));
  assert.ok(gaugeNames.includes('design-lint.entropy.agentAttributionRatio'));
  assert.ok(gaugeNames.includes('design-lint.entropy.rateOfChange'));
  assert.ok(gaugeNames.includes('design-lint.entropy.violationConcentration'));
});

void test('createOtelInstrumentation.recordEntropy records correct overall value', () => {
  const { tracer, meter, gauges } = makeTracerAndSpans();
  const instrumentation = createOtelInstrumentation(tracer, meter);
  instrumentation.recordEntropy(
    makeEntropyEvent(82, '2026-04-12T00:00:00.000Z'),
  );

  const overall = gauges.find((g) => g.name === 'design-lint.entropy.overall');
  assert.ok(overall !== undefined);
  assert.equal(overall.value, 82);
});
