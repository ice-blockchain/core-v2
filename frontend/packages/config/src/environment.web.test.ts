import type { EnvironmentConfig } from './types';

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_ENV',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_RELAY_URL',
  'NEXT_PUBLIC_LOG_LEVEL',
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

  if (vars.APP_ENV) process.env.NEXT_PUBLIC_APP_ENV = vars.APP_ENV;
  if (vars.API_BASE_URL) process.env.NEXT_PUBLIC_API_BASE_URL = vars.API_BASE_URL;
  if (vars.RELAY_URL) process.env.NEXT_PUBLIC_RELAY_URL = vars.RELAY_URL;
  if (vars.LOG_LEVEL) process.env.NEXT_PUBLIC_LOG_LEVEL = vars.LOG_LEVEL;

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
  it('reads config from NEXT_PUBLIC_ env vars and returns validated result', () => {
    const config = loadWebEnvironment(validVars);

    expect(config).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when NEXT_PUBLIC_ env vars are missing', () => {
    expect(() => loadWebEnvironment({ APP_ENV: 'staging' })).toThrow(
      'Missing required environment variable',
    );
  });
});
