import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native-config', () => ({ default: {} }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const validVars = {
  APP_ENV: 'staging',
  API_BASE_URL: 'https://api.staging.ion.app',
  IDENTITY_IOS_APP_ID: 'ap-test-ios-id',
  IDENTITY_ANDROID_APP_ID: 'ap-test-android-id',
  RELAY_URL: 'wss://relay.staging.ion.app',
  LOG_LEVEL: 'debug',
};

describe('environmentConfig (mobile)', () => {
  beforeEach(() => vi.resetModules());

  it('reads config from react-native-config and returns validated result', async () => {
    vi.doMock('react-native-config', () => ({ default: validVars }));
    const { environmentConfig } = await import('./environment.native');

    expect(environmentConfig).toEqual({
      appEnvironment: 'staging',
      apiBaseUrl: 'https://api.staging.ion.app',
      identityAppId: 'ap-test-ios-id',
      relayUrl: 'wss://relay.staging.ion.app',
      logLevel: 'debug',
    });
  });

  it('throws when react-native-config provides incomplete vars', async () => {
    vi.doMock('react-native-config', () => ({
      default: { APP_ENV: 'staging' },
    }));

    await expect(import('./environment.native')).rejects.toThrow(
      'Missing required environment variable',
    );
  });
});
