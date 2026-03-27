import i18next from 'i18next';

import type { TranslationResource } from './types';
import { SUPPORTED_LOCALES } from './supported-locales';
import { registerTranslations } from './register-translations';

function createInstance() {
  const instance = i18next.createInstance();
  instance.init({ lng: 'en', resources: {} });
  return instance;
}

function buildFullResources(
  namespace: string,
): TranslationResource[] {
  return SUPPORTED_LOCALES.map((locale) => ({
    namespace,
    locale,
    translations: { greeting: `hello-${locale}` },
  }));
}

describe('registerTranslations', () => {
  it('adds resource bundles for each locale', () => {
    const instance = createInstance();
    const resources = buildFullResources('auth-ui');

    registerTranslations(instance, resources);

    expect(instance.getResourceBundle('en', 'auth-ui')).toEqual({
      greeting: 'hello-en',
    });
    expect(instance.getResourceBundle('pt', 'auth-ui')).toEqual({
      greeting: 'hello-pt',
    });
  });

  it('throws when a supported locale is missing', () => {
    const instance = createInstance();
    const partial: TranslationResource[] = [
      { namespace: 'test', locale: 'en', translations: { key: 'v' } },
    ];

    expect(() => registerTranslations(instance, partial)).toThrow(
      /missing translations for/,
    );
  });

  it('does nothing for an empty resource array', () => {
    const instance = createInstance();
    expect(() => registerTranslations(instance, [])).not.toThrow();
  });

  it('lists all missing locales in the error message', () => {
    const instance = createInstance();
    const partial: TranslationResource[] = [
      { namespace: 'x', locale: 'en', translations: {} },
      { namespace: 'x', locale: 'pt', translations: {} },
    ];

    expect(() => registerTranslations(instance, partial)).toThrow(
      'pt-BR, es, fr, de',
    );
  });
});
