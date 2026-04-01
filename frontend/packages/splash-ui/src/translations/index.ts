import type { TranslationResource } from '@ion/localization';

import { splashEN } from './en';
import { splashFR } from './fr';
import { splashDE } from './de';

export const SPLASH_NAMESPACE = 'splash';

export const splashTranslations: readonly TranslationResource[] = [
  { namespace: SPLASH_NAMESPACE, locale: 'en', translations: splashEN },
  { namespace: SPLASH_NAMESPACE, locale: 'fr', translations: splashFR },
  { namespace: SPLASH_NAMESPACE, locale: 'de', translations: splashDE },
];
