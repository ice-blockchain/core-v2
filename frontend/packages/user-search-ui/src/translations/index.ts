import type { TranslationResource } from "@ion/localization";

import { userSearchEN } from "./en";
import { userSearchFR } from "./fr";
import { userSearchDE } from "./de";

export const USER_SEARCH_NAMESPACE = "userSearch";

export const userSearchTranslations: readonly TranslationResource[] = [
  { namespace: USER_SEARCH_NAMESPACE, locale: "en", translations: userSearchEN },
  { namespace: USER_SEARCH_NAMESPACE, locale: "fr", translations: userSearchFR },
  { namespace: USER_SEARCH_NAMESPACE, locale: "de", translations: userSearchDE },
];
