import type { TranslationResource } from "@ion/localization";

import { feedEN } from "./en";
import { feedFR } from "./fr";
import { feedDE } from "./de";

export const FEED_NAMESPACE = "feed";

export const feedTranslations: readonly TranslationResource[] = [
  { namespace: FEED_NAMESPACE, locale: "en", translations: feedEN },
  { namespace: FEED_NAMESPACE, locale: "fr", translations: feedFR },
  { namespace: FEED_NAMESPACE, locale: "de", translations: feedDE },
];
