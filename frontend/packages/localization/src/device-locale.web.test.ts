import { describe, it, expect, afterEach } from 'vitest';

import { getDeviceLocale } from './device-locale.web';

describe('getDeviceLocale (web)', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('returns first language from navigator.languages', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['de', 'en'], language: 'de' },
      writable: true,
    });
    expect(getDeviceLocale()).toBe('de');
  });

  it('falls back to navigator.language when languages is empty', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: [], language: 'fr' },
      writable: true,
    });
    expect(getDeviceLocale()).toBe('fr');
  });

  it('returns en when navigator is undefined', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
    });
    expect(getDeviceLocale()).toBe('en');
  });
});
