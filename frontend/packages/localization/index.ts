// Engine
export {
  createLocalization,
  translate,
  getCurrentLocale,
} from './src/create-localization';
export { registerTranslations } from './src/register-translations';

// Language management
export { changeLanguage } from './src/change-language';

// Platform
export { getDeviceLocale } from './src/device-locale';
export { buildFallbackChain } from './src/fallback-chain';

// Config
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './src/supported-locales';

// Types
export type {
  LocalizationConfig,
  TranslationResource,
  SupportedLocale,
} from './src/types';
