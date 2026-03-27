import type { TranslationResource } from '@ion/localization';

import { onboardingEN } from './en';
import { onboardingFR } from './fr';
import { onboardingDE } from './de';

export const ONBOARDING_NAMESPACE = 'onboarding';

export const onboardingTranslations: readonly TranslationResource[] = [
  { namespace: ONBOARDING_NAMESPACE, locale: 'en', translations: onboardingEN },
  { namespace: ONBOARDING_NAMESPACE, locale: 'fr', translations: onboardingFR },
  { namespace: ONBOARDING_NAMESPACE, locale: 'de', translations: onboardingDE },
];
