/** DLTS v1 event type discriminant. */
export type DLTSEventType =
  | 'RunEvent'
  | 'DiagnosticEvent'
  | 'FixEvent'
  | 'CorrectionEvent'
  | 'AgentSessionEvent'
  | 'KernelMutationEvent'
  | 'SnapshotEvent'
  | 'EntropyEvent';

/** Common envelope shared by all DLTS v1 events. */
export interface DLTSEnvelope {
  $schema: string;
  specVersion: '1.0.0';
  eventType: DLTSEventType;
  timestamp: string;
  runId: string;
  workspaceRunId?: string;
  kernelSnapshotHash: string;
  /** AI agent identifier — present on events attributed to a specific agent session. */
  agentId?: string;
}

/** A single lint run start/complete event. */
export interface RunEvent extends DLTSEnvelope {
  eventType: 'RunEvent';
  filesScanned: number;
  durationMs: number;
  totalDiagnostics: number;
  errorCount: number;
  warnCount: number;
}

/** A single diagnostic emitted during a run. */
export interface DiagnosticEvent extends DLTSEnvelope {
  eventType: 'DiagnosticEvent';
  ruleId: string;
  severity: 'error' | 'warn';
  message: string;
  file: string;
  line: number;
  column: number;
  agentId?: string;
}

/** An auto-fix applied to a diagnostic. */
export interface FixEvent extends DLTSEnvelope {
  eventType: 'FixEvent';
  ruleId: string;
  file: string;
  line: number;
  column: number;
  before: string;
  after: string;
}

/** An AI agent correction cycle. */
export interface CorrectionEvent extends DLTSEnvelope {
  eventType: 'CorrectionEvent';
  agentId: string;
  iterationsUsed: number;
  converged: boolean;
  violationsRemaining: number;
}

/** An AI agent session boundary. */
export interface AgentSessionEvent extends DLTSEnvelope {
  eventType: 'AgentSessionEvent';
  agentId: string;
  sessionId: string;
  action: 'start' | 'end';
}

/** A design system token graph mutation. */
export interface KernelMutationEvent extends DLTSEnvelope {
  eventType: 'KernelMutationEvent';
  mutationType: 'add' | 'update' | 'deprecate' | 'remove';
  pointer: string;
}

/** A kernel snapshot checkpoint. */
export interface SnapshotEvent extends DLTSEnvelope {
  eventType: 'SnapshotEvent';
  snapshotHash: string;
  tokenCount: number;
}

/** Per-run entropy score event. */
export interface EntropyEvent extends DLTSEnvelope {
  eventType: 'EntropyEvent';
  score: EntropyScore;
}

/** Design system health entropy score (0–100, lower is more entropic). */
export interface EntropyScore {
  overall: number;
  byCategory: Record<string, number>;
  byFile?: Record<string, number>;
  components: {
    tokenCoverageRatio: number;
    violationRecurrenceRate: number;
    agentAttributionRatio: number;
    rateOfChange: number;
    violationConcentration: number;
  };
}

/** Aggregated report over a set of run events. */
export interface AggregateReport {
  totalRuns: number;
  totalFilesScanned: number;
  totalDiagnostics: number;
  averageDurationMs: number;
}

/** Entropy trend over a sliding window. */
export interface EntropyTrend {
  windowSize: number;
  points: ReadonlyArray<{ timestamp: string; overall: number }>;
  delta: number;
}

/** Result of validating a raw DLTS event. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
