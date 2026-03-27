import { describe, it, expect, vi } from 'vitest';

let mockStore = new Map<string, string>();

vi.mock('./device-locale', () => ({
  getDeviceLocale: () => 'fr',
}));

vi.mock('@ion/storage', () => ({
  createKeyValueStorage: () => ({
    getString: (key: string) => mockStore.get(key) ?? null,
    setString: (key: string, value: string) => {
      mockStore.set(key, value);
    },
    removeItem: (key: string) => { mockStore.delete(key); },
    hasItem: (key: string) => mockStore.has(key),
    clear: () => { mockStore.clear(); },
  }),
}));

import { createLocalization, translate, getCurrentLocale } from './create-localization';

describe('createLocalization', () => {
  it('initializes with device locale when no stored preference', () => {
    mockStore = new Map();
    const instance = createLocalization();
    expect(instance.language).toBe('fr');
  });

  it('prefers stored locale over device locale', () => {
    mockStore = new Map([['user_preferred_locale', 'de']]);
    const instance = createLocalization();
    expect(instance.language).toBe('de');
  });

  it('configures fallback chain correctly', () => {
    mockStore = new Map([['user_preferred_locale', 'de']]);
    const instance = createLocalization();
    expect(instance.options.fallbackLng).toEqual([
      'de',
      'en',
    ]);
  });
});

describe('translate', () => {
  it('translates a registered key', () => {
    mockStore = new Map();
    const instance = createLocalization();
    instance.addResourceBundle('fr', 'test', { hello: 'Bonjour' });
    expect(translate('test:hello')).toBe('Bonjour');
  });

  it('throws when localization is not initialized', async () => {
    vi.resetModules();
    vi.doMock('./device-locale', () => ({
      getDeviceLocale: () => 'en',
    }));
    const fresh = await import('./create-localization');
    expect(() => fresh.translate('key')).toThrow(
      'Localization not initialized',
    );
  });
});

describe('getCurrentLocale', () => {
  it('returns the active locale', () => {
    mockStore = new Map();
    createLocalization();
    expect(getCurrentLocale()).toBe('fr');
  });
});
