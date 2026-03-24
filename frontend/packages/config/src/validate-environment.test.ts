import { validateEnvironmentConfig } from './validate-environment';

const validConfig = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

describe('validateEnvironmentConfig', () => {
  it('returns mapped config when all keys are valid', () => {
    const result = validateEnvironmentConfig(validConfig);

    expect(result).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('accepts all valid environments', () => {
    for (const env of ['staging', 'testnet', 'production'] as const) {
      const result = validateEnvironmentConfig({ ...validConfig, APP_ENV: env });
      expect(result.appEnvironment).toBe(env);
    }
  });

  it('accepts all valid log levels', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      const result = validateEnvironmentConfig({ ...validConfig, LOG_LEVEL: level });
      expect(result.logLevel).toBe(level);
    }
  });

  it.each(['APP_ENV', 'API_BASE_URL', 'RELAY_URL', 'LOG_LEVEL'])(
    'throws when %s is missing',
    (key) => {
      const config = { ...validConfig, [key]: undefined };
      expect(() => validateEnvironmentConfig(config)).toThrow(
        `Missing required environment variable: ${key}`,
      );
    },
  );

  it('throws when APP_ENV is invalid', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, APP_ENV: 'development' }),
    ).toThrow('Invalid APP_ENV: "development"');
  });

  it('throws when LOG_LEVEL is invalid', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, LOG_LEVEL: 'verbose' }),
    ).toThrow('Invalid LOG_LEVEL: "verbose"');
  });
});
