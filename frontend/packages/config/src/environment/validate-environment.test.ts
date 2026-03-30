import { validateEnvironmentConfig } from './validate-environment';

const validConfig = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  IDENTITY_APP_ID: 'ap-test-app-id',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

describe('validateEnvironmentConfig', () => {
  it('returns mapped config when all keys are valid', () => {
    const result = validateEnvironmentConfig(validConfig);

    expect(result).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      identityAppId: 'ap-test-app-id',
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

  it.each(['APP_ENV', 'API_BASE_URL', 'IDENTITY_APP_ID', 'RELAY_URL', 'LOG_LEVEL'])(
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

  it('throws when API_BASE_URL is not a valid URL', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, API_BASE_URL: 'not-a-url' }),
    ).toThrow('Invalid API_BASE_URL: "not-a-url". Must be a valid URL');
  });

  it('throws when API_BASE_URL uses http instead of https', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, API_BASE_URL: 'http://api.ion.app' }),
    ).toThrow('Invalid API_BASE_URL: "http://api.ion.app". Must use https://');
  });

  it('throws when RELAY_URL is not a valid URL', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, RELAY_URL: 'javascript:alert(1)' }),
    ).toThrow('Must use wss://');
  });

  it('throws when RELAY_URL uses ws instead of wss', () => {
    expect(() =>
      validateEnvironmentConfig({ ...validConfig, RELAY_URL: 'ws://relay.ion.app' }),
    ).toThrow('Invalid RELAY_URL: "ws://relay.ion.app". Must use wss://');
  });
});
