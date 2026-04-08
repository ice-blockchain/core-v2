import type { TranslationResource } from "@ion/localization";

export const PROFILE_NAMESPACE = "profile";

const profileEN = {
  editProfile: "Edit profile",
  following: "Following",
  followers: "Followers",
  tabPosts: "Posts",
  tabReplies: "Replies",
  tabVideos: "Videos",
  tabArticles: "Articles",
  emptyPostsOwn: "You don't have any posts",
  emptyRepliesOwn: "You don't have any replies",
  emptyVideosOwn: "You don't have any videos",
  emptyArticlesOwn: "You don't have any articles",
  emptyPostsOther: "@{{username}} doesn't have any posts",
  emptyRepliesOther: "@{{username}} doesn't have any replies",
  emptyVideosOther: "@{{username}} doesn't have any videos",
  emptyArticlesOther: "@{{username}} doesn't have any articles",
};

const profileFR = {
  editProfile: "Modifier le profil",
  following: "Abonnements",
  followers: "Abonnes",
  tabPosts: "Publications",
  tabReplies: "Reponses",
  tabVideos: "Videos",
  tabArticles: "Articles",
  emptyPostsOwn: "Vous n'avez aucune publication",
  emptyRepliesOwn: "Vous n'avez aucune reponse",
  emptyVideosOwn: "Vous n'avez aucune video",
  emptyArticlesOwn: "Vous n'avez aucun article",
  emptyPostsOther: "@{{username}} n'a aucune publication",
  emptyRepliesOther: "@{{username}} n'a aucune reponse",
  emptyVideosOther: "@{{username}} n'a aucune video",
  emptyArticlesOther: "@{{username}} n'a aucun article",
};

const profileDE = {
  editProfile: "Profil bearbeiten",
  following: "Folge ich",
  followers: "Follower",
  tabPosts: "Beitraege",
  tabReplies: "Antworten",
  tabVideos: "Videos",
  tabArticles: "Artikel",
  emptyPostsOwn: "Du hast keine Beitraege",
  emptyRepliesOwn: "Du hast keine Antworten",
  emptyVideosOwn: "Du hast keine Videos",
  emptyArticlesOwn: "Du hast keine Artikel",
  emptyPostsOther: "@{{username}} hat keine Beitraege",
  emptyRepliesOther: "@{{username}} hat keine Antworten",
  emptyVideosOther: "@{{username}} hat keine Videos",
  emptyArticlesOther: "@{{username}} hat keine Artikel",
};

export const profileTranslations: readonly TranslationResource[] = [
  { namespace: PROFILE_NAMESPACE, locale: "en", translations: profileEN },
  { namespace: PROFILE_NAMESPACE, locale: "fr", translations: profileFR },
  { namespace: PROFILE_NAMESPACE, locale: "de", translations: profileDE },
];
