import type { TranslationResource } from "@ion/localization";

export const FEED_NAMESPACE = "feed";

const feedEN = {
  searchPlaceholder: "Search",
  storyYouLabel: "you",
  emptyTitle: "There are no posts at the moment",
  categoryFeed: "Feed",
  categoryVideos: "Videos",
  categoryArticles: "Articles",
  filterForYou: "For you",
  filterFollowing: "Following",
};

const feedFR = {
  searchPlaceholder: "Rechercher",
  storyYouLabel: "vous",
  emptyTitle: "Il n'y a pas de publications pour le moment",
  categoryFeed: "Fil",
  categoryVideos: "Videos",
  categoryArticles: "Articles",
  filterForYou: "Pour vous",
  filterFollowing: "Abonnements",
};

const feedDE = {
  searchPlaceholder: "Suchen",
  storyYouLabel: "du",
  emptyTitle: "Es gibt derzeit keine Beitraege",
  categoryFeed: "Feed",
  categoryVideos: "Videos",
  categoryArticles: "Artikel",
  filterForYou: "Fuer dich",
  filterFollowing: "Folge ich",
};

export const feedTranslations: readonly TranslationResource[] = [
  { namespace: FEED_NAMESPACE, locale: "en", translations: feedEN },
  { namespace: FEED_NAMESPACE, locale: "fr", translations: feedFR },
  { namespace: FEED_NAMESPACE, locale: "de", translations: feedDE },
];
