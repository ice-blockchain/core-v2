import i18next from 'i18next';
import type { i18n } from 'i18next';

import type { IKeyValueStorage } from '@ion/storage';
import { getDeviceLocale } from './device-locale';
import { buildFallbackChain } from './fallback-chain';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './supported-locales';

const LANGUAGE_PREFERENCE_KEY = 'user_preferred_locale';

let instance: i18n | null = null;
let storageRef: IKeyValueStorage | null = null;

interface CreateLocalizationOptions {
  readonly storage?: IKeyValueStorage;
}

export function createLocalization(
  options?: CreateLocalizationOptions,
): i18n {
  storageRef = options?.storage ?? null;
  instance = i18next.createInstance();

  const locale = resolveLocale();
  const fallback = buildFallbackChain(locale, DEFAULT_LOCALE);

  instance.init({
    lng: locale,
    fallbackLng: fallback,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [],
    interpolation: { escapeValue: false },
    initAsync: false,
  });

  return instance;
}

function resolveLocale(): string {
  const stored = storageRef?.getString(LANGUAGE_PREFERENCE_KEY);
  if (stored) return stored;

  const deviceLocale = getDeviceLocale();
  return deviceLocale;
}

export function translate(
  key: string,
  options?: Record<string, unknown>,
): string {
  if (!instance) {
    throw new Error(
      'Localization not initialized. Call createLocalization() first.',
    );
  }
  if (options) {
    return instance.t(key, options);
  }
  return instance.t(key);
}

export function getCurrentLocale(): string {
  if (!instance) {
    throw new Error(
      'Localization not initialized. Call createLocalization() first.',
    );
  }
  return instance.language;
}

export { LANGUAGE_PREFERENCE_KEY };
