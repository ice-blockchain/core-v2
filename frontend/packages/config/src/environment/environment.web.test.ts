import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_KEYS = [
  'VITE_APP_ENV',
  'VITE_API_BASE_URL',
  'VITE_IDENTITY_APP_ID',
  'VITE_RELAY_URL',
  'VITE_LOG_LEVEL',
] as const;

function clearWebEnvVars(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function setWebEnvVars(vars: Partial<Record<string, string>>): void {
  clearWebEnvVars();
  if (vars.APP_ENV) process.env.VITE_APP_ENV = vars.APP_ENV;
  if (vars.API_BASE_URL) process.env.VITE_API_BASE_URL = vars.API_BASE_URL;
  if (vars.IDENTITY_APP_ID) process.env.VITE_IDENTITY_APP_ID = vars.IDENTITY_APP_ID;
  if (vars.RELAY_URL) process.env.VITE_RELAY_URL = vars.RELAY_URL;
  if (vars.LOG_LEVEL) process.env.VITE_LOG_LEVEL = vars.LOG_LEVEL;
}

const validVars = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  IDENTITY_APP_ID: 'ap-test-app-id',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

describe('environmentConfig (web)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => clearWebEnvVars());

  it('reads config from VITE_ env vars and returns validated result', async () => {
    setWebEnvVars(validVars);
    const { environmentConfig } = await import('./environment.web');

    expect(environmentConfig).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      identityAppId: 'ap-test-app-id',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when VITE_ env vars are missing', async () => {
    setWebEnvVars({ APP_ENV: 'staging' });

    await expect(import('./environment.web')).rejects.toThrow(
      'Missing required environment variable',
    );
  });
});
