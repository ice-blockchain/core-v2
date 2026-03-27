import type { TranslationResource } from '@ion/localization';

import { authEN } from './en';
import { authFR } from './fr';
import { authDE } from './de';

export const AUTH_NAMESPACE = 'auth';

export const authTranslations: readonly TranslationResource[] = [
  { namespace: AUTH_NAMESPACE, locale: 'en', translations: authEN },
  { namespace: AUTH_NAMESPACE, locale: 'fr', translations: authFR },
  { namespace: AUTH_NAMESPACE, locale: 'de', translations: authDE },
];
