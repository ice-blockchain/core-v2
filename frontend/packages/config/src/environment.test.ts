import type { EnvironmentConfig } from './types';

jest.mock('react-native-config', () => ({ __esModule: true, default: {} }));

const validVars = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

function loadEnvironment(vars: Record<string, string>): EnvironmentConfig {
  jest.resetModules();
  jest.doMock('react-native-config', () => ({ __esModule: true, default: vars }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./environment').environmentConfig as EnvironmentConfig;
}

describe('environmentConfig (mobile)', () => {
  it('reads config from react-native-config and returns validated result', () => {
    const config = loadEnvironment(validVars);

    expect(config).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when react-native-config provides incomplete vars', () => {
    expect(() => loadEnvironment({ APP_ENV: 'staging' })).toThrow(
      'Missing required environment variable',
    );
  });
});
