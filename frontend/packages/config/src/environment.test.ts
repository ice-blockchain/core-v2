import type { EnvironmentConfig } from './types';

jest.mock('react-native-config', () => ({ default: {} }));

function loadEnvironment(vars: Record<string, string>): EnvironmentConfig {
  jest.resetModules();
  jest.doMock('react-native-config', () => ({ default: vars }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./environment').environmentConfig as EnvironmentConfig;
}

describe('environmentConfig', () => {
  it('returns valid config when all required keys are present', () => {
    const config = loadEnvironment({
      APP_ENV: 'staging',
      API_BASE_URL: 'https://api.staging.ion.app',
      RELAY_URL: 'wss://relay.staging.ion.app',
      LOG_LEVEL: 'debug',
    });

    expect(config).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when a required key is missing', () => {
    expect(() =>
      loadEnvironment({
        APP_ENV: 'staging',
        API_BASE_URL: 'https://api.staging.ion.app',
        RELAY_URL: 'wss://relay.staging.ion.app',
      }),
    ).toThrow('Missing required environment variable: LOG_LEVEL');
  });

  it('throws when APP_ENV is not a valid environment', () => {
    expect(() =>
      loadEnvironment({
        APP_ENV: 'development',
        API_BASE_URL: 'https://api.staging.ion.app',
        RELAY_URL: 'wss://relay.staging.ion.app',
        LOG_LEVEL: 'debug',
      }),
    ).toThrow('Invalid APP_ENV: "development"');
  });

  it('accepts all three valid environments', () => {
    for (const env of ['staging', 'testnet', 'production'] as const) {
      const config = loadEnvironment({
        APP_ENV: env,
        API_BASE_URL: 'https://api.ion.app',
        RELAY_URL: 'wss://relay.ion.app',
        LOG_LEVEL: 'info',
      });
      expect(config.appEnvironment).toBe(env);
    }
  });
});
