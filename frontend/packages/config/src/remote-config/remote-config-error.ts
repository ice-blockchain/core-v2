export enum ConfigErrorCode {
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_FETCH_FAILED = 'CONFIG_FETCH_FAILED',
  CONFIG_VERSION_MISSING = 'CONFIG_VERSION_MISSING',
}

export class ConfigError extends Error {
  constructor(
    public readonly code: ConfigErrorCode,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}
