# Agent Execution Protocol — Specification v1

**Status:** Stable  
**Authors:** Lapidist contributors  
**Publication URL:** `https://aep.design-lint.lapidist.net/v1`

---

## 1. Introduction

The Agent Execution Protocol (AEP) is a versioned envelope format used by the
`@lapidist/design-lint` MCP server to return lint results to AI coding agents.
It wraps every tool response with metadata that allows agents to:

1. Identify the protocol version and reject unsupported versions.
2. Correlate results with the DSR kernel snapshot that produced them.
3. Attribute lint requests to a specific agent session.

AEP v1 is the initial stable release. It is implemented by the
`lint_snippet`, `get_token_completions`, and `validate_component_usage` MCP tools.

---

## 2. Response envelope (`AepResponseMeta`)

Every AEP-compliant response MUST include the following fields in the `meta` object
at the top level of the JSON response object returned by the MCP tool:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `runId` | `string` | Yes | Unique identifier for this tool invocation (UUID) |
| `aepVersion` | `string` | Yes | MUST be `"1"` for this revision |
| `kernelSnapshotHash` | `string` | Yes | SHA-256 of the DSR kernel snapshot (hex, 16-char prefix); `"local"` when no live snapshot is available |

Note: `agentId` and `iterationDepth` are **request** parameters (see §4), not response
envelope fields. The response carries `iterationsUsed` (the actual count) and the
per-diagnostic `agentId` attribution in `AEPDiagnostic`, not in the top-level envelope.

The remaining fields in the response are tool-specific and defined in §4.

---

## 3. Version negotiation

Clients MUST send `aepVersion: "1"` in tool arguments. The server MUST reject requests
with an unknown `aepVersion` by returning a structured error response:

```json
{
  "error": "Unsupported AEP version: <version>. This server implements AEP v1.",
  "aepVersion": "1"
}
```

Unknown versions MUST NOT be processed as if they were v1.

---

## 4. Tool-specific response schemas

### 4.1 `lint_snippet`

**Arguments:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | `string` | Yes | Source code to lint |
| `fileType` | `string` | Yes | File type hint (`typescript`, `css`, `scss`, `less`, `vue`, `svelte`) |
| `iterationDepth` | `integer >= 1` | Yes | Refinement depth; controls how many passes to run |
| `agentId` | `string` | No | Agent session identifier (default: `"unknown"`) |
| `aepVersion` | `string` | No | Must be `"1"` if provided |

**Response fields (in addition to the AEP envelope):**

| Field | Type | Description |
| --- | --- | --- |
| `violations` | `AEPViolation[]` | All lint violations found |
| `fixedCode` | `string or null` | Auto-fixed source if fixable violations were found |
| `iterationsUsed` | `integer` | Number of refinement passes applied |

**`AEPViolation` shape:**

| Field | Type | Description |
| --- | --- | --- |
| `ruleId` | `string` | Rule identifier (e.g. `design-token/colors`) |
| `message` | `string` | Human-readable violation description |
| `line` | `integer` | 1-based line number |
| `column` | `integer` | 1-based column number |
| `severity` | `"error" or "warn"` | Severity level |
| `fixable` | `boolean` | Whether auto-fix is available |

---

## 5. `kernelSnapshotHash` semantics

The `kernelSnapshotHash` field communicates which DSR kernel snapshot was used to
evaluate lint rules. Agents SHOULD use this value to detect when the kernel has been
updated between requests (snapshot hash changes) and invalidate any cached token
completions accordingly.

- When a live DSR kernel is connected: the value is a 16-character hex prefix of the
  SHA-256 hash of the kernel's token graph.
- When no live kernel is available (local config fallback): the value is `"local"`.
  Agents SHOULD treat `"local"` as indicating a degraded mode with no kernel snapshot.

---

## 6. Versioning

AEP documents are versioned via the `aepVersion` field. This spec defines version `"1"`.
Future revisions MUST use a new integer string (`"2"`, `"3"`, …). Semantic versioning
is not used for AEP — each version is a breaking change by definition.

---

## 7. Conformance

A response is considered AEP v1 conforming if and only if:

1. `meta.aepVersion` equals `"1"`
2. `meta.runId` is a non-empty string
3. `meta.kernelSnapshotHash` is a non-empty string
