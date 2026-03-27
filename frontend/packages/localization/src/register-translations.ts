import type { i18n } from 'i18next';

import type { TranslationResource } from './types';
import { SUPPORTED_LOCALES } from './supported-locales';

export function registerTranslations(
  instance: i18n,
  resources: readonly TranslationResource[],
): void {
  if (resources.length === 0) return;

  const namespace = resources[0]!.namespace;
  validateLocaleCoverage(namespace, resources);

  for (const resource of resources) {
    instance.addResourceBundle(
      resource.locale,
      resource.namespace,
      resource.translations,
      true,
      false,
    );
  }
}

function validateLocaleCoverage(
  namespace: string,
  resources: readonly TranslationResource[],
): void {
  const provided = new Set(resources.map((r) => r.locale));
  const missing = SUPPORTED_LOCALES.filter((l) => !provided.has(l));

  if (missing.length > 0) {
    throw new Error(
      `Namespace "${namespace}" is missing translations for: ${missing.join(', ')}`,
    );
  }
}
