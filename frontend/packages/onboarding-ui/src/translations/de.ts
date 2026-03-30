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
};
