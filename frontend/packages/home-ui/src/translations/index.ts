import type { TranslationResource } from "@ion/localization";

export const HOME_NAMESPACE = "home";

const homeEN = {};
const homeFR = {};
const homeDE = {};

export const homeTranslations: readonly TranslationResource[] = [
  { namespace: HOME_NAMESPACE, locale: "en", translations: homeEN },
  { namespace: HOME_NAMESPACE, locale: "fr", translations: homeFR },
  { namespace: HOME_NAMESPACE, locale: "de", translations: homeDE },
];
