import type { TranslationResource } from '@ion/localization';

import { authEN } from './en';
import { authPT } from './pt';
import { authPTBR } from './pt-BR';
import { authES } from './es';
import { authFR } from './fr';
import { authDE } from './de';

export const AUTH_NAMESPACE = 'auth';

export const authTranslations: readonly TranslationResource[] = [
  { namespace: AUTH_NAMESPACE, locale: 'en', translations: authEN },
  { namespace: AUTH_NAMESPACE, locale: 'pt', translations: authPT },
  { namespace: AUTH_NAMESPACE, locale: 'pt-BR', translations: authPTBR },
  { namespace: AUTH_NAMESPACE, locale: 'es', translations: authES },
  { namespace: AUTH_NAMESPACE, locale: 'fr', translations: authFR },
  { namespace: AUTH_NAMESPACE, locale: 'de', translations: authDE },
];
