/**
 * Unit tests for the write API CLI commands.
 *
 * Tests use stub transport implementations to avoid requiring a running kernel.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenAdd,
  tokenDeprecate,
  componentRegister,
  ruleConfigure,
} from '../../src/cli/write.js';

// ---------------------------------------------------------------------------
// Transport stubs
// ---------------------------------------------------------------------------

interface KWPFrame {
  type: string;
  id: string;
  method?: string;
  payload?: unknown;
  error?: { code: string; message: string };
}

type RequestHandler = (method: string, payload: unknown) => KWPFrame;

function makeStubClient(handleRequest: RequestHandler) {
  return class StubClient {
    readonly calls: { method: string; payload: unknown }[] = [];
    readonly #handle: RequestHandler;

    constructor() {
      this.#handle = handleRequest;
    }

    async connect(): Promise<void> {
      /* no-op */
    }

    async disconnect(): Promise<void> {
      /* no-op */
    }

    request(frame: KWPFrame): Promise<KWPFrame> {
      const method = frame.method ?? '';
      this.calls.push({ method, payload: frame.payload });
      return Promise.resolve(this.#handle(method, frame.payload));
    }
  };
}

function okResponse(method: string): KWPFrame {
  return { type: 'response', id: 'test', method, payload: null };
}

function errorResponse(code: string, message: string): KWPFrame {
  return { type: 'error', id: 'test', error: { code, message } };
}

// ---------------------------------------------------------------------------
// tokenAdd
// ---------------------------------------------------------------------------

test('tokenAdd sends write.addToken with correct pointer and name', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenAdd(
    { pointer: '/color/brand/primary', name: 'Brand Primary' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, 'write.addToken');
  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.pointer, '/color/brand/primary');
  const tok = p.token as Record<string, unknown>;
  assert.equal(tok.pointer, '/color/brand/primary');
  assert.equal(tok.name, 'Brand Primary');
});

test('tokenAdd normalises pointer without leading slash', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenAdd(
    { pointer: 'color/brand/secondary', name: 'Brand Secondary' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.pointer, '/color/brand/secondary');
});

test('tokenAdd includes type and parsed value when provided', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenAdd(
    {
      pointer: '/color/brand/primary',
      name: 'Brand Primary',
      type: 'color',
      value: '"#ff0000"',
    },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const tok = (calls[0]?.payload as Record<string, unknown>).token as Record<
    string,
    unknown
  >;
  assert.equal(tok.type, 'color');
  assert.equal(tok.value, '#ff0000');
});

test('tokenAdd uses raw string value when JSON parse fails', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenAdd(
    {
      pointer: '/size/base',
      name: 'Base Size',
      value: 'not-valid-json',
    },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const tok = (calls[0]?.payload as Record<string, unknown>).token as Record<
    string,
    unknown
  >;
  assert.equal(tok.value, 'not-valid-json');
});

test('tokenAdd throws on kernel error response', async () => {
  const StubClient = makeStubClient(() =>
    errorResponse('NOT_FOUND', 'Pointer not found'),
  );

  await assert.rejects(
    () =>
      tokenAdd(
        { pointer: '/x', name: 'X' },
        {
          UnixSocketClient: StubClient as never,
          HttpClient: StubClient as never,
        },
      ),
    /Kernel error/,
  );
});

// ---------------------------------------------------------------------------
// tokenDeprecate
// ---------------------------------------------------------------------------

test('tokenDeprecate sends write.deprecateToken with pointer', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenDeprecate(
    { pointer: '/color/legacy/red' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  assert.equal(calls[0]?.method, 'write.deprecateToken');
  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.pointer, '/color/legacy/red');
  assert.equal(p.replacement, undefined);
});

test('tokenDeprecate includes replacement when provided', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await tokenDeprecate(
    { pointer: '/color/legacy/red', replacement: '/color/brand/primary' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.replacement, '/color/brand/primary');
});

// ---------------------------------------------------------------------------
// componentRegister
// ---------------------------------------------------------------------------

test('componentRegister sends write.registerComponent with name and package', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await componentRegister(
    { name: 'Button', packageName: '@acme/ui' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  assert.equal(calls[0]?.method, 'write.registerComponent');
  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.name, 'Button');
  const def = p.definition as Record<string, unknown>;
  assert.equal(def.name, 'Button');
  assert.equal(def.package, '@acme/ui');
});

test('componentRegister includes version and replaces when provided', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await componentRegister(
    {
      name: 'Button',
      packageName: '@acme/ui',
      version: '2.0.0',
      replaces: 'LegacyButton, OldButton',
    },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const def = (calls[0]?.payload as Record<string, unknown>)
    .definition as Record<string, unknown>;
  assert.equal(def.version, '2.0.0');
  assert.deepEqual(def.replaces, ['LegacyButton', 'OldButton']);
});

// ---------------------------------------------------------------------------
// ruleConfigure
// ---------------------------------------------------------------------------

test('ruleConfigure sends write.configureRule with severity', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await ruleConfigure(
    { ruleId: 'color/no-raw-value', severity: 'error' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  assert.equal(calls[0]?.method, 'write.configureRule');
  const p = calls[0]?.payload as Record<string, unknown>;
  assert.equal(p.ruleId, 'color/no-raw-value');
  const partial = p.partial as Record<string, unknown>;
  assert.equal(partial.severity, 'error');
  assert.equal(partial.enabled, true);
});

test('ruleConfigure sets enabled=false when severity is off', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await ruleConfigure(
    { ruleId: 'color/no-raw-value', severity: 'off' },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const partial = (calls[0]?.payload as Record<string, unknown>)
    .partial as Record<string, unknown>;
  assert.equal(partial.severity, 'off');
  assert.equal(partial.enabled, false);
});

test('ruleConfigure sends options when provided', async () => {
  const calls: { method: string; payload: unknown }[] = [];
  const StubClient = makeStubClient((method, payload) => {
    calls.push({ method, payload });
    return okResponse(method);
  });

  await ruleConfigure(
    {
      ruleId: 'color/no-raw-value',
      options: '{"allowedColors":["#fff"]}',
    },
    { UnixSocketClient: StubClient as never, HttpClient: StubClient as never },
  );

  const partial = (calls[0]?.payload as Record<string, unknown>)
    .partial as Record<string, unknown>;
  assert.deepEqual(partial.options, { allowedColors: ['#fff'] });
});

test('ruleConfigure throws for invalid JSON options', async () => {
  const StubClient = makeStubClient((method) => okResponse(method));

  await assert.rejects(
    () =>
      ruleConfigure(
        { ruleId: 'color/no-raw-value', options: '{bad}' },
        {
          UnixSocketClient: StubClient as never,
          HttpClient: StubClient as never,
        },
      ),
    /Invalid JSON/,
  );
});

test('ruleConfigure throws when no severity or options provided', async () => {
  const StubClient = makeStubClient((method) => okResponse(method));

  await assert.rejects(
    () =>
      ruleConfigure(
        { ruleId: 'color/no-raw-value' },
        {
          UnixSocketClient: StubClient as never,
          HttpClient: StubClient as never,
        },
      ),
    /at least one/,
  );
});

test('ruleConfigure throws for invalid severity value', async () => {
  const StubClient = makeStubClient((method) => okResponse(method));

  await assert.rejects(
    () =>
      ruleConfigure(
        { ruleId: 'color/no-raw-value', severity: 'critical' },
        {
          UnixSocketClient: StubClient as never,
          HttpClient: StubClient as never,
        },
      ),
    /Invalid severity/,
  );
});
