import type { IKeyValueStorage } from '@ion/storage';

jest.mock('./device-locale', () => ({
  getDeviceLocale: () => 'fr',
}));

import { createLocalization, translate, getCurrentLocale } from './create-localization';

function createMockStorage(
  data: Record<string, string> = {},
): IKeyValueStorage {
  const store = new Map(Object.entries(data));
  return {
    getString: (key: string) => store.get(key) ?? null,
    setString: (key: string, value: string) => { store.set(key, value); },
    getNumber: () => null,
    setNumber: () => {},
    getBoolean: () => null,
    setBoolean: () => {},
    getObject: () => null,
    setObject: () => {},
    removeItem: (key: string) => { store.delete(key); },
    hasItem: (key: string) => store.has(key),
    clear: () => { store.clear(); },
  };
}

describe('createLocalization', () => {
  it('initializes with device locale when no stored preference', () => {
    const instance = createLocalization();
    expect(instance.language).toBe('fr');
  });

  it('prefers stored locale over device locale', () => {
    const storage = createMockStorage({
      user_preferred_locale: 'de',
    });
    const instance = createLocalization({ storage });
    expect(instance.language).toBe('de');
  });

  it('configures fallback chain correctly', () => {
    const storage = createMockStorage({
      user_preferred_locale: 'pt-BR',
    });
    const instance = createLocalization({ storage });
    expect(instance.options.fallbackLng).toEqual([
      'pt-BR',
      'pt',
      'en',
    ]);
  });
});

describe('translate', () => {
  it('translates a registered key', () => {
    const instance = createLocalization();
    instance.addResourceBundle('fr', 'test', { hello: 'Bonjour' });
    expect(translate('test:hello')).toBe('Bonjour');
  });

  it('throws when localization is not initialized', () => {
    jest.resetModules();
    jest.mock('./device-locale', () => ({
      getDeviceLocale: () => 'en',
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fresh = require('./create-localization');
    expect(() => fresh.translate('key')).toThrow(
      'Localization not initialized',
    );
  });
});

describe('getCurrentLocale', () => {
  it('returns the active locale', () => {
    createLocalization();
    expect(getCurrentLocale()).toBe('fr');
  });
});
