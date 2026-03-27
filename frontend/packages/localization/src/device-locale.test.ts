jest.mock('react-native', () => ({
  NativeModules: {
    SettingsManager: { settings: { AppleLanguages: ['pt-BR', 'en'] } },
    I18nManager: { localeIdentifier: 'es_AR' },
  },
  Platform: { OS: 'ios' },
}));

describe('getDeviceLocale (native)', () => {
  beforeEach(() => jest.resetModules());

  it('returns first Apple language on iOS', () => {
    jest.doMock('react-native', () => ({
      NativeModules: {
        SettingsManager: { settings: { AppleLanguages: ['pt-BR', 'en'] } },
      },
      Platform: { OS: 'ios' },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDeviceLocale } = require('./device-locale.native');
    expect(getDeviceLocale()).toBe('pt-BR');
  });

  it('returns locale from I18nManager on Android', () => {
    jest.doMock('react-native', () => ({
      NativeModules: {
        I18nManager: { localeIdentifier: 'fr_FR' },
      },
      Platform: { OS: 'android' },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDeviceLocale } = require('./device-locale.native');
    expect(getDeviceLocale()).toBe('fr-FR');
  });

  it('falls back to en when no native data is available', () => {
    jest.doMock('react-native', () => ({
      NativeModules: {},
      Platform: { OS: 'ios' },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDeviceLocale } = require('./device-locale.native');
    expect(getDeviceLocale()).toBe('en');
  });
});
