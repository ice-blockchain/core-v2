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
  nicknameReservedDescription:
    'Dieser Spitzname ist reserviert. Sende eine E-Mail von deiner Firmen-E-Mail-Adresse an hi@ice.io, um ihn zu beanspruchen.',
};
