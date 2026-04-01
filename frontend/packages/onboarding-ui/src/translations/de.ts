import type { onboardingEN } from './en';

export const onboardingDE: Record<keyof typeof onboardingEN, string> = {
  selectLanguagesTitle: 'Sprachen auswählen',
  selectLanguagesSubtitle:
    'Dir werden Inhalte in der ausgewählten Sprache angezeigt',
  searchPlaceholder: 'Suchen',
  continueButton: 'Weiter',
  saveButton: 'Speichern',
  yourProfileTitle: 'Dein Profil',
  namePlaceholder: 'Name',
  nicknamePlaceholder: 'Spitzname',
  referralPlaceholder: 'Wer hat dich eingeladen',
  customizeAccountSubtitle: 'Passe dein Konto an',
  nicknameReservedTitle: 'Spitzname ist reserviert',
  nicknameReservedModalTitle: 'Information',
  nicknameReservedDescription:
    'Wenn du diesen Spitznamen verwenden möchtest, sende bitte eine E-Mail an hi@ice.io von der offiziellen E-Mail-Adresse deines Unternehmens. Wir werden deine Anfrage prüfen und dich so schnell wie möglich kontaktieren.',
  closeModal: 'Schließen',
  discoverCreatorsTitle: 'Ersteller entdecken',
  discoverCreatorsSubtitle: 'Verbinde dich mit Visionären und inspirierenden Stimmen',
  notificationsTitle: 'Benachrichtigungen aktivieren',
  notificationsSubtitle:
    'Erhalte Benachrichtigungen, wenn du Geldmittel sendest und empfängst',
  receivedIonTitle: 'ION erhalten',
  receivedIonDescription: 'Du hast 873 ION von @james erhalten',
  receivedIonTime: 'vor 15m',
  newFollowerTitle: 'Neuer Follower',
  newFollowerDescription: '@curtis folgt dir jetzt',
  newFollowerTime: 'vor 24m',
  newMessageTitle: 'Neue Nachricht',
  newMessageDescription: '@marie hat dir eine Nachricht gesendet',
  newMessageTime: 'vor 31m',
  notificationDescriptionAssets:
    'Erhalte Benachrichtigungen beim Senden oder Empfangen von Vermögenswerten',
  notificationDescriptionNews: 'Bleibe über die neuesten Nachrichten informiert',
  notificationDescriptionChat:
    'Chatte und erhalte Benachrichtigungen, auch wenn die App geschlossen ist',
  followingButton: 'Folge ich',
  followButton: 'Folgen',
  nicknameReservedError: 'Spitzname ist reserviert',
  nicknameAlreadyTakenError: 'Spitzname ist bereits vergeben',
  nicknameInvalidCharactersError:
    'Nur Buchstaben, Zahlen und Punkte sind erlaubt',
  validationFailedError: 'Validierung fehlgeschlagen',
  nicknameDoesNotExistError: 'Spitzname existiert nicht',
  cannotBeEmptyError: 'Darf nicht leer sein',
};
