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
};
