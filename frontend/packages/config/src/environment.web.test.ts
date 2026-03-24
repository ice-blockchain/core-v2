import type { EnvironmentConfig } from './types';

const ENV_KEYS = [
  'VITE_APP_ENV',
  'VITE_API_BASE_URL',
  'VITE_RELAY_URL',
  'VITE_LOG_LEVEL',
] as const;

function clearWebEnvVars(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function loadWebEnvironment(
  vars: Partial<Record<string, string>>,
): EnvironmentConfig {
  jest.resetModules();
  clearWebEnvVars();

  if (vars.APP_ENV) process.env.VITE_APP_ENV = vars.APP_ENV;
  if (vars.API_BASE_URL) process.env.VITE_API_BASE_URL = vars.API_BASE_URL;
  if (vars.RELAY_URL) process.env.VITE_RELAY_URL = vars.RELAY_URL;
  if (vars.LOG_LEVEL) process.env.VITE_LOG_LEVEL = vars.LOG_LEVEL;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./environment.web').environmentConfig as EnvironmentConfig;
}

const validVars = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

afterEach(() => {
  clearWebEnvVars();
});

describe('environmentConfig (web)', () => {
  it('reads config from VITE_ env vars and returns validated result', () => {
    const config = loadWebEnvironment(validVars);

    expect(config).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when VITE_ env vars are missing', () => {
    expect(() => loadWebEnvironment({ APP_ENV: 'staging' })).toThrow(
      'Missing required environment variable',
    );
  });
});
