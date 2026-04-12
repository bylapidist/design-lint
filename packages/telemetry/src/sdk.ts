import type {
  AggregateReport,
  DiagnosticEvent,
  DLTSEnvelope,
  EntropyEvent,
  EntropyTrend,
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
    return { totalRuns: 0, totalFilesScanned: 0, totalDiagnostics: 0, averageDurationMs: 0 };
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
export function computeEntropyTrend(events: EntropyEvent[], windowSize: number): EntropyTrend {
  const window = events.slice(-windowSize);
  const points = window.map((e) => ({ timestamp: e.timestamp, overall: e.score.overall }));
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
export function filterByAgent(events: DLTSEnvelope[], agentId: string): DLTSEnvelope[] {
  return events.filter((e) => e.agentId === agentId);
}

/**
 * Groups diagnostic events by rule id.
 *
 * @param {DiagnosticEvent[]} events - Diagnostic events to group.
 * @returns {Record<string, DiagnosticEvent[]>} Events keyed by rule id.
 */
export function groupByRule(events: DiagnosticEvent[]): Record<string, DiagnosticEvent[]> {
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
