export interface EngineErrorOptions {
  message: string;
  context: string;
  remediation: string;
}

export class EngineError extends Error {
  context: string;
  remediation: string;

  constructor(opts: EngineErrorOptions) {
    super(
      `${opts.message}\nContext: ${opts.context}\nRemediation: ${opts.remediation}`,
    );
    this.context = opts.context;
    this.remediation = opts.remediation;
  }
}

export class PluginError extends EngineError {}
export class ConfigError extends EngineError {}
