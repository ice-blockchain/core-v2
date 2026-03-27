import type { SUPPORTED_LOCALES } from './supported-locales';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface TranslationResource {
  readonly namespace: string;
  readonly locale: SupportedLocale;
  readonly translations: Readonly<Record<string, string>>;
}

export interface LocalizationConfig {
  readonly supportedLocales: readonly SupportedLocale[];
  readonly defaultLocale: SupportedLocale;
}
