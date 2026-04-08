import type { TranslationResource } from '@ion/localization';

import { navigationEN } from './en';
import { navigationFR } from './fr';
import { navigationDE } from './de';

export const NAVIGATION_NAMESPACE = 'navigation';

export const navigationTranslations: readonly TranslationResource[] = [
  { namespace: NAVIGATION_NAMESPACE, locale: 'en', translations: navigationEN },
  { namespace: NAVIGATION_NAMESPACE, locale: 'fr', translations: navigationFR },
  { namespace: NAVIGATION_NAMESPACE, locale: 'de', translations: navigationDE },
];
