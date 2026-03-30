import { describe, it, expect } from 'vitest';

import { ConfigError, ConfigErrorCode } from './remote-config-error';

describe('ConfigError', () => {
  it('sets code, message, and name', () => {
    const error = new ConfigError(ConfigErrorCode.CONFIG_NOT_FOUND, 'not found');

    expect(error.code).toBe(ConfigErrorCode.CONFIG_NOT_FOUND);
    expect(error.message).toBe('not found');
    expect(error.name).toBe('ConfigError');
    expect(error).toBeInstanceOf(Error);
  });

  it('preserves the original cause', () => {
    const cause = new Error('network down');
    const error = new ConfigError(ConfigErrorCode.CONFIG_FETCH_FAILED, 'fetch failed', cause);

    expect(error.cause).toBe(cause);
  });
});
