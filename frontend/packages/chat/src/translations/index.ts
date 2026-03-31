import type { TranslationResource } from "@ion/localization";

export const CHAT_NAMESPACE = "chat";

const chatEN = {
  chatsTitle: "Chats",
  editButton: "Edit",
  emptyStateMessage: "You have no conversations yet",
  newMessageButton: "New message",
};

const chatFR = {
  chatsTitle: "Discussions",
  editButton: "Modifier",
  emptyStateMessage: "Vous n'avez pas encore de conversations",
  newMessageButton: "Nouveau message",
};

const chatDE = {
  chatsTitle: "Chats",
  editButton: "Bearbeiten",
  emptyStateMessage: "Du hast noch keine Unterhaltungen",
  newMessageButton: "Neue Nachricht",
};

export const chatTranslations: readonly TranslationResource[] = [
  { namespace: CHAT_NAMESPACE, locale: "en", translations: chatEN },
  { namespace: CHAT_NAMESPACE, locale: "fr", translations: chatFR },
  { namespace: CHAT_NAMESPACE, locale: "de", translations: chatDE },
];
