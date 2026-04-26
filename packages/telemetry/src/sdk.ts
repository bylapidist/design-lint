import type {
  AggregateReport,
  CorrectionEvent,
  DiagnosticEvent,
  DLTSEnvelope,
  EntropyEvent,
  EntropyTrend,
  FixEvent,
  KernelInstrumentation,
  KernelMutationEvent,
  OtelMeter,
  OtelTracer,
  RunEvent,
  ValidationResult,
} from './types.js';

/**
 * Parses a newline-delimited JSON stream of DLTS events.
 *
 * @param {string} ndjson - Newline-delimited JSON string.
 * @returns {DLTSEnvelope[]} Parsed event envelopes.
 */
export function parseDLTSStream(ndjson: string): DLTSEnvelope[] {
  return ndjson
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as DLTSEnvelope);
}

/**
 * Validates that a raw value conforms to the DLTS envelope shape.
 *
 * @param {unknown} event - The raw value to validate.
 * @returns {ValidationResult} Whether the event is valid and any error messages.
 */
export function validateDLTSEvent(event: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof event !== 'object' || event === null) {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  const record = event as Record<string, unknown>;

  if (typeof record['specVersion'] !== 'string') {
    errors.push('Missing or invalid "specVersion"');
  }
  if (typeof record['eventType'] !== 'string') {
    errors.push('Missing or invalid "eventType"');
  }
  if (typeof record['timestamp'] !== 'string') {
    errors.push('Missing or invalid "timestamp"');
  }
  if (typeof record['runId'] !== 'string') {
    errors.push('Missing or invalid "runId"');
  }
  if (typeof record['kernelSnapshotHash'] !== 'string') {
    errors.push('Missing or invalid "kernelSnapshotHash"');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Aggregates a set of run events into a summary report.
 *
 * @param {RunEvent[]} events - Run events to aggregate.
 * @returns {AggregateReport} Aggregated metrics.
 */
export function aggregateRunEvents(events: RunEvent[]): AggregateReport {
  if (events.length === 0) {
    return {
      totalRuns: 0,
      totalFilesScanned: 0,
      totalDiagnostics: 0,
      averageDurationMs: 0,
    };
  }

  let totalFilesScanned = 0;
  let totalDiagnostics = 0;
  let totalDurationMs = 0;

  for (const event of events) {
    totalFilesScanned += event.filesScanned;
    totalDiagnostics += event.totalDiagnostics;
    totalDurationMs += event.durationMs;
  }

  return {
    totalRuns: events.length,
    totalFilesScanned,
    totalDiagnostics,
    averageDurationMs: totalDurationMs / events.length,
  };
}

/**
 * Computes an entropy trend over a sliding window of entropy events.
 *
 * @param {EntropyEvent[]} events - Entropy events sorted oldest-first.
 * @param {number} windowSize - Number of events in the sliding window.
 * @returns {EntropyTrend} The trend including delta between first and last point.
 */
export function computeEntropyTrend(
  events: EntropyEvent[],
  windowSize: number,
): EntropyTrend {
  const window = events.slice(-windowSize);
  const points = window.map((e) => ({
    timestamp: e.timestamp,
    overall: e.score.overall,
  }));
  const first = points[0]?.overall ?? 0;
  const last = points.at(-1)?.overall ?? 0;
  return { windowSize, points, delta: last - first };
}

/**
 * Filters DLTS events by agent identifier.
 *
 * @param {DLTSEnvelope[]} events - All events to filter.
 * @param {string} agentId - The agent id to match against.
 * @returns {DLTSEnvelope[]} Events attributed to the given agent.
 */
export function filterByAgent(
  events: DLTSEnvelope[],
  agentId: string,
): DLTSEnvelope[] {
  return events.filter((e) => e.agentId === agentId);
}

/**
 * Groups diagnostic events by rule id.
 *
 * @param {DiagnosticEvent[]} events - Diagnostic events to group.
 * @returns {Record<string, DiagnosticEvent[]>} Events keyed by rule id.
 */
export function groupByRule(
  events: DiagnosticEvent[],
): Record<string, DiagnosticEvent[]> {
  const result: Record<string, DiagnosticEvent[]> = {};

  for (const event of events) {
    const bucket = result[event.ruleId];
    if (bucket === undefined) {
      result[event.ruleId] = [event];
    } else {
      bucket.push(event);
    }
  }

  return result;
}

/**
 * Creates an OTel instrumentation bridge for the design-lint kernel.
 *
 * - `RunEvent` → root span with run metadata attributes
 * - `DiagnosticEvent` → child span with ruleId, severity, line, column
 * - `FixEvent` → span with addEvent carrying before/after text
 * - `CorrectionEvent` → span with addEvent carrying convergence metadata
 * - `KernelMutationEvent` → span with addEvent carrying mutation details
 * - `EntropyEvent` → gauge metric observations for each entropy component
 *
 * @param {OtelTracer} tracer - An OTel tracer instance.
 * @param {OtelMeter} meter - An OTel meter instance (used for gauge metrics).
 * @returns {KernelInstrumentation} The kernel instrumentation handle.
 */
export function createOtelInstrumentation(
  tracer: OtelTracer,
  meter: OtelMeter,
): KernelInstrumentation {
  return {
    recordRun(event: RunEvent): void {
      const span = tracer.startSpan('design-lint.run');
      span.setAttribute('runId', event.runId);
      span.setAttribute('filesScanned', event.filesScanned);
      span.setAttribute('totalDiagnostics', event.totalDiagnostics);
      span.setAttribute('durationMs', event.durationMs);
      span.setAttribute('errorCount', event.errorCount);
      span.setAttribute('warnCount', event.warnCount);
      span.end();
    },

    recordDiagnostic(event: DiagnosticEvent): void {
      const span = tracer.startSpan('design-lint.diagnostic');
      span.setAttribute('runId', event.runId);
      span.setAttribute('ruleId', event.ruleId);
      span.setAttribute('severity', event.severity);
      span.setAttribute('file', event.file);
      span.setAttribute('line', event.line);
      span.setAttribute('column', event.column);
      if (event.agentId !== undefined) {
        span.setAttribute('agentId', event.agentId);
      }
      span.end();
    },

    recordFix(event: FixEvent): void {
      const span = tracer.startSpan('design-lint.fix');
      span.setAttribute('runId', event.runId);
      span.setAttribute('ruleId', event.ruleId);
      span.setAttribute('file', event.file);
      span.setAttribute('line', event.line);
      span.addEvent('fix.applied', {
        before: event.before,
        after: event.after,
      });
      span.end();
    },

    recordCorrection(event: CorrectionEvent): void {
      const span = tracer.startSpan('design-lint.correction');
      span.setAttribute('runId', event.runId);
      span.setAttribute('agentId', event.agentId);
      span.addEvent('correction.cycle', {
        iterationsUsed: event.iterationsUsed,
        converged: event.converged,
        violationsRemaining: event.violationsRemaining,
      });
      span.end();
    },

    recordKernelMutation(event: KernelMutationEvent): void {
      const span = tracer.startSpan('design-lint.kernel-mutation');
      span.setAttribute('runId', event.runId);
      span.addEvent('kernel.mutation', {
        mutationType: event.mutationType,
        pointer: event.pointer,
      });
      span.end();
    },

    recordEntropy(event: EntropyEvent): void {
      const span = tracer.startSpan('design-lint.entropy');
      span.setAttribute('runId', event.runId);
      span.setAttribute('overall', event.score.overall);
      span.end();

      const { components } = event.score;

      meter
        .createObservableGauge('design-lint.entropy.overall', {
          description: 'Overall design-system entropy score (0–100)',
        })
        .record(event.score.overall, { runId: event.runId });

      meter
        .createObservableGauge('design-lint.entropy.tokenCoverageRatio', {
          description: 'Ratio of design tokens used vs available',
        })
        .record(components.tokenCoverageRatio, { runId: event.runId });

      meter
        .createObservableGauge('design-lint.entropy.violationRecurrenceRate', {
          description: 'Rate of recurring violations across runs',
        })
        .record(components.violationRecurrenceRate, { runId: event.runId });

      meter
        .createObservableGauge('design-lint.entropy.agentAttributionRatio', {
          description: 'Ratio of violations attributed to AI agents',
        })
        .record(components.agentAttributionRatio, { runId: event.runId });

      meter
        .createObservableGauge('design-lint.entropy.rateOfChange', {
          description: 'Rate of entropy change between runs',
        })
        .record(components.rateOfChange, { runId: event.runId });

      meter
        .createObservableGauge('design-lint.entropy.violationConcentration', {
          description: 'Concentration of violations in a small set of files',
        })
        .record(components.violationConcentration, { runId: event.runId });
    },

    async shutdown(): Promise<void> {
      // No-op in the base implementation — real shutdown is handled by the
      // OTel SDK's NodeTracerProvider.shutdown() called by the host process.
    },
  };
}
