import type { TranslationResource } from "@ion/localization";

export const WALLET_UI_NAMESPACE = "walletUi";

const walletUiEN = {
  balanceLabel: "Balance",
  balanceAmount: "$0.00",
  buyAction: "Buy",
  receiveAction: "Receive",
  swapAction: "Swap",
  moreAction: "More",
  friendsTitle: "Friends",
  viewAllLink: "view all",
  portfolioTitle: "Portfolio",
  portfolioDescription:
    "Track and manage all your crypto securely in one place",
  coinsTab: "Coins",
  nftsTab: "NFTs",
  emptyCoinsMessage: "You have no coins yet",
  emptyNftsMessage: "You don't have any NFT's",
  receiveNftLink: "Receive NFT",
  manageCoinsButton: "Manage coins",
  walletName: "ion.wallet",
  swapBannerTitle: "Swap",
  swapBannerDescription:
    "Swap your tokens instantly and securely, directly from your wallet",
  bridgeBannerTitle: "Bridge",
  bridgeBannerDescription:
    "Bridge your tokens securely across multiple connected networks",
  balanceHidden: "********",
  searchPlaceholder: "Search",
  cancelButton: "Cancel",
};

const walletUiFR = {
  balanceLabel: "Solde",
  balanceAmount: "0,00 $",
  buyAction: "Acheter",
  receiveAction: "Recevoir",
  swapAction: "Echanger",
  moreAction: "Plus",
  friendsTitle: "Amis",
  viewAllLink: "voir tout",
  portfolioTitle: "Portfolio",
  portfolioDescription:
    "Suivez et gerez toutes vos cryptos en toute securite",
  coinsTab: "Jetons",
  nftsTab: "NFTs",
  emptyCoinsMessage: "Vous n'avez pas encore de jetons",
  emptyNftsMessage: "Vous n'avez aucun NFT",
  receiveNftLink: "Recevoir un NFT",
  manageCoinsButton: "Gerer les jetons",
  walletName: "ion.wallet",
  swapBannerTitle: "Echanger",
  swapBannerDescription:
    "Echangez vos jetons instantanement et en toute securite, directement depuis votre portefeuille",
  bridgeBannerTitle: "Pont",
  bridgeBannerDescription:
    "Transferez vos jetons en toute securite sur plusieurs reseaux connectes",
  balanceHidden: "********",
  searchPlaceholder: "Rechercher",
  cancelButton: "Annuler",
};

const walletUiDE = {
  balanceLabel: "Guthaben",
  balanceAmount: "0,00 $",
  buyAction: "Kaufen",
  receiveAction: "Empfangen",
  swapAction: "Tauschen",
  moreAction: "Mehr",
  friendsTitle: "Freunde",
  viewAllLink: "alle anzeigen",
  portfolioTitle: "Portfolio",
  portfolioDescription:
    "Verfolgen und verwalten Sie alle Ihre Kryptos sicher an einem Ort",
  coinsTab: "Coins",
  nftsTab: "NFTs",
  emptyCoinsMessage: "Sie haben noch keine Coins",
  emptyNftsMessage: "Sie haben keine NFTs",
  receiveNftLink: "NFT empfangen",
  manageCoinsButton: "Coins verwalten",
  walletName: "ion.wallet",
  swapBannerTitle: "Tauschen",
  swapBannerDescription:
    "Tauschen Sie Ihre Token sofort und sicher, direkt aus Ihrer Wallet",
  bridgeBannerTitle: "Bridge",
  bridgeBannerDescription:
    "Ubertragen Sie Ihre Token sicher uber mehrere verbundene Netzwerke",
  balanceHidden: "********",
  searchPlaceholder: "Suchen",
  cancelButton: "Abbrechen",
};

export const walletUiTranslations: readonly TranslationResource[] = [
  { namespace: WALLET_UI_NAMESPACE, locale: "en", translations: walletUiEN },
  { namespace: WALLET_UI_NAMESPACE, locale: "fr", translations: walletUiFR },
  { namespace: WALLET_UI_NAMESPACE, locale: "de", translations: walletUiDE },
];
