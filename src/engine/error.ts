export interface EngineErrorOptions {
  message: string;
  context: string;
  remediation: string;
}

export function createEngineError(opts: EngineErrorOptions): Error {
  return new Error(
    `${opts.message}\nContext: ${opts.context}\nRemediation: ${opts.remediation}`,
  );
}
