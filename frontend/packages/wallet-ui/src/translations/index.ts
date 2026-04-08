import type { TranslationResource } from "@ion/localization";
import { walletUiEN } from "./en";
import { walletUiFR } from "./fr";
import { walletUiDE } from "./de";

export { walletUiEN } from "./en";
export { walletUiFR } from "./fr";
export { walletUiDE } from "./de";

export const WALLET_UI_NAMESPACE = "walletUi";

export const walletUiTranslations: readonly TranslationResource[] = [
  { namespace: WALLET_UI_NAMESPACE, locale: "en", translations: walletUiEN },
  { namespace: WALLET_UI_NAMESPACE, locale: "fr", translations: walletUiFR },
  { namespace: WALLET_UI_NAMESPACE, locale: "de", translations: walletUiDE },
];
