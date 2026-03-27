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
  nicknameReservedDescription:
    'Ce pseudo est réservé. Pour le revendiquer, envoyez un e-mail à hi@ice.io depuis votre adresse e-mail professionnelle.',
};
