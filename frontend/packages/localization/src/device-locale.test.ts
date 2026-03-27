import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({
  NativeModules: {
    SettingsManager: { settings: { AppleLanguages: ['pt-BR', 'en'] } },
    I18nManager: { localeIdentifier: 'es_AR' },
  },
  Platform: { OS: 'ios' },
}));

describe('getDeviceLocale (native)', () => {
  beforeEach(() => vi.resetModules());

  it('returns first Apple language on iOS', async () => {
    vi.doMock('react-native', () => ({
      NativeModules: {
        SettingsManager: { settings: { AppleLanguages: ['pt-BR', 'en'] } },
      },
      Platform: { OS: 'ios' },
    }));
    const { getDeviceLocale } = await import('./device-locale.native');
    expect(getDeviceLocale()).toBe('pt-BR');
  });

  it('returns locale from I18nManager on Android', async () => {
    vi.doMock('react-native', () => ({
      NativeModules: {
        I18nManager: { localeIdentifier: 'fr_FR' },
      },
      Platform: { OS: 'android' },
    }));
    const { getDeviceLocale } = await import('./device-locale.native');
    expect(getDeviceLocale()).toBe('fr-FR');
  });

  it('falls back to en when no native data is available', async () => {
    vi.doMock('react-native', () => ({
      NativeModules: {},
      Platform: { OS: 'ios' },
    }));
    const { getDeviceLocale } = await import('./device-locale.native');
    expect(getDeviceLocale()).toBe('en');
  });
});
