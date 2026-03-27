import { NativeModules, Platform } from 'react-native';
import { DEFAULT_LOCALE } from './supported-locales';

export function getDeviceLocale(): string {
  if (Platform.OS === 'ios') {
    return getIosLocale();
  }
  return getAndroidLocale();
}

function normalizeLocaleIdentifier(locale: string): string {
  return locale.replace(/_/g, '-');
}

function getIosLocale(): string {
  const settings = NativeModules.SettingsManager?.settings as
    | Record<string, unknown>
    | undefined;
  const languages = settings?.AppleLanguages as string[] | undefined;
  return normalizeLocaleIdentifier(languages?.[0] ?? DEFAULT_LOCALE);
}

function getAndroidLocale(): string {
  const locale = NativeModules.I18nManager?.localeIdentifier as
    | string
    | undefined;
  if (!locale) return DEFAULT_LOCALE;
  return normalizeLocaleIdentifier(locale);
}
