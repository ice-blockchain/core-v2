import type { TranslationResource } from "@ion/localization";

export const CHAT_NAMESPACE = "chat";

const chatEN = {
  chatsTitle: "Chats",
  editButton: "Edit",
  doneButton: "Done",
  emptyStateMessage: "You have no conversations yet",
  newMessageButton: "New message",
  readAllAction: "Read",
  archiveAction: "Archive",
  deleteAction: "Delete",
  newChatTitle: "New chat",
  newChatEmptyState: "You have no contacts yet. Start by searching for users above",
  deleteChatTitle: "Delete chat?",
  deleteChatMessage: "Are you sure you want to delete all selected chats?",
  cancelButton: "Cancel",
};

const chatFR = {
  chatsTitle: "Discussions",
  editButton: "Modifier",
  doneButton: "Terminé",
  emptyStateMessage: "Vous n'avez pas encore de conversations",
  newMessageButton: "Nouveau message",
  readAllAction: "Lire",
  archiveAction: "Archiver",
  deleteAction: "Supprimer",
  newChatTitle: "Nouvelle discussion",
  newChatEmptyState: "Vous n'avez pas encore de contacts. Commencez par rechercher des utilisateurs ci-dessus",
  deleteChatTitle: "Supprimer la discussion ?",
  deleteChatMessage: "Voulez-vous vraiment supprimer toutes les discussions sélectionnées ?",
  cancelButton: "Annuler",
};

const chatDE = {
  chatsTitle: "Chats",
  editButton: "Bearbeiten",
  doneButton: "Fertig",
  emptyStateMessage: "Du hast noch keine Unterhaltungen",
  newMessageButton: "Neue Nachricht",
  readAllAction: "Lesen",
  archiveAction: "Archivieren",
  deleteAction: "Löschen",
  newChatTitle: "Neuer Chat",
  newChatEmptyState: "Du hast noch keine Kontakte. Suche oben nach Benutzern",
  deleteChatTitle: "Chat löschen?",
  deleteChatMessage: "Möchtest du wirklich alle ausgewählten Chats löschen?",
  cancelButton: "Abbrechen",
};

export const chatTranslations: readonly TranslationResource[] = [
  { namespace: CHAT_NAMESPACE, locale: "en", translations: chatEN },
  { namespace: CHAT_NAMESPACE, locale: "fr", translations: chatFR },
  { namespace: CHAT_NAMESPACE, locale: "de", translations: chatDE },
];
