// Engine
export {
  createLocalization,
  translate,
  getCurrentLocale,
} from './create-localization';
export { registerTranslations } from './register-translations';

// Language management
export { changeLanguage } from './change-language';

// Platform
export { getDeviceLocale } from './device-locale';
export { buildFallbackChain } from './fallback-chain';

// Config
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './supported-locales';

// Types
export type {
  LocalizationConfig,
  TranslationResource,
  SupportedLocale,
} from './types';
