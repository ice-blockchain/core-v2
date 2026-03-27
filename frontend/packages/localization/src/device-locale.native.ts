import { NativeModules, Platform } from 'react-native';

export function getDeviceLocale(): string {
  if (Platform.OS === 'ios') {
    return getIosLocale();
  }
  return getAndroidLocale();
}

function getIosLocale(): string {
  const settings = NativeModules.SettingsManager?.settings as
    | Record<string, unknown>
    | undefined;
  const languages = settings?.AppleLanguages as string[] | undefined;
  return languages?.[0] ?? 'en';
}

function getAndroidLocale(): string {
  const locale = NativeModules.I18nManager?.localeIdentifier as
    | string
    | undefined;
  if (!locale) return 'en';
  return locale.replace('_', '-');
}
