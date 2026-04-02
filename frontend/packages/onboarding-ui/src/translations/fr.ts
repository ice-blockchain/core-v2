import type { onboardingEN } from './en';

export const onboardingFR: Record<keyof typeof onboardingEN, string> = {
  selectLanguagesTitle: 'Sélectionner les langues',
  selectLanguagesSubtitle:
    'Le contenu sera affiché dans la langue sélectionnée',
  searchPlaceholder: 'Rechercher',
  continueButton: 'Continuer',
  saveButton: 'Enregistrer',
  yourProfileTitle: 'Votre profil',
  namePlaceholder: 'Nom',
  nicknamePlaceholder: 'Pseudo',
  referralPlaceholder: 'Qui vous a invité',
  customizeAccountSubtitle: 'Personnalisez votre compte',
  nicknameReservedTitle: 'Pseudo réservé',
  nicknameReservedModalTitle: 'Information',
  nicknameReservedDescription:
    'Si vous souhaitez utiliser ce pseudo, veuillez envoyer un e-mail à hi@ice.io depuis l\'adresse e-mail officielle de votre entreprise. Nous examinerons votre demande et vous contacterons dès que possible.',
  closeModal: 'Fermer',
  discoverCreatorsTitle: 'Découvrir les créateurs',
  discoverCreatorsSubtitle: 'Connectez-vous avec des visionnaires et des voix inspirantes',
  notificationsTitle: 'Activer les notifications',
  notificationsSubtitle:
    'Recevez des notifications lorsque vous transférez et recevez des fonds',
  receivedIonTitle: 'ION reçu',
  receivedIonDescription: 'Vous avez reçu 873 ION de @james',
  receivedIonTime: 'il y a 15m',
  newFollowerTitle: 'Nouvel abonné',
  newFollowerDescription: '@curtis a commencé à vous suivre',
  newFollowerTime: 'il y a 24m',
  newMessageTitle: 'Nouveau message',
  newMessageDescription: '@marie vous a envoyé un message',
  newMessageTime: 'il y a 31m',
  notificationDescriptionAssets:
    'Recevez des notifications lors de l\'envoi ou la réception d\'actifs',
  notificationDescriptionNews: 'Restez informé des dernières nouvelles',
  notificationDescriptionChat:
    'Discutez et recevez des notifications même si l\'application est fermée',
  followingButton: 'Abonné',
  followButton: 'Suivre',
  nicknameReservedError: 'Le pseudo est réservé',
  nicknameAlreadyTakenError: 'Le pseudo est déjà pris',
  nicknameInvalidCharactersError:
    'Seuls les lettres, chiffres et points sont autorisés',
  validationFailedError: 'Échec de la validation',
  nicknameDoesNotExistError: 'Le pseudo n\'existe pas',
  cannotBeEmptyError: 'Ne peut pas être vide',
};
