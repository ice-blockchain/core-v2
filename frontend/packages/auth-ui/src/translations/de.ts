import type { authEN } from './en';

export const authDE: Record<keyof typeof authEN, string> = {
  getStartedTitle: 'Loslegen',
  getStartedSubtitle:
    'Gib den Namen deines Identitätsschlüssels ein, um dich anzumelden',
  identityKeyNameLabel: 'Name des Identitätsschlüssels',
  continueButton: 'Weiter',
  orDivider: 'oder',
  registerButton: 'Registrieren',
  restoreIdentityKeyButton: 'Identitätsschlüssel wiederherstellen',
  passwordLabel: 'Passwort',
  confirmPasswordLabel: 'Passwort bestätigen',
  registerTitle: 'Registrieren',
  registerSubtitle:
    'Wähle ein starkes Passwort, um ein Konto zu erstellen',
  passwordsMatchLabel: 'Passwörter stimmen überein',
  verifyPasskeyTitle: 'Mit Passkey verifizieren',
  verifyPasskeySubtitle:
    'Dein Gerät wird dich auffordern, diese Aktion mit deinem Fingerabdruck, Gesicht oder Bildschirmsperre zu bestätigen',
  verifyPasswordTitle: 'Mit Passwort verifizieren',
  verifyPasswordSubtitle:
    'Dein Gerät wird dein Passwort zur Bestätigung abfragen',
  verifyPasswordConfirmSubtitle:
    'Bitte bestätige dein Passwort, um fortzufahren.',
  confirmButton: 'Bestätigen',
  identityKeyCharactersError:
    'Nur Kleinbuchstaben, Zahlen, Punkte und Bindestriche',
  identityKeyMaxLengthError: 'Name des Identitätsschlüssels ist zu lang',
  enterIdentityKeyNameError:
    'Gib den Namen des Identitätsschlüssels ein',
  passwordRuleLength: 'Muss mehr als 8 Zeichen haben',
  passwordRuleNumber: 'Muss 1 Zahl enthalten',
  passwordRuleCase: 'Groß- und Kleinbuchstaben',
  passwordRuleSpecial: 'Muss 1 Sonderzeichen enthalten',
  noPasswordBenefitTitle: 'Kein Passwort zum Merken',
  noPasswordBenefitSubtitle:
    'Mit dem Passkey kannst du deinen Fingerabdruck oder dein Gesicht zum Anmelden verwenden',
  worksOnDevicesTitle: 'Funktioniert auf allen deinen Geräten',
  worksOnDevicesSubtitle:
    'Der Passkey wird automatisch auf deinen synchronisierten Geräten verfügbar sein',
  keepAccountSaferTitle: 'Halte dein Konto sicherer',
  keepAccountSaferSubtitle:
    'Passkeys bieten modernsten Phishing-Schutz',
  securedByLabel: 'Gesichert durch',
  termsAgreementPrefix: 'Durch Fortfahren stimmst du unseren ',
  termsOfServiceLink: 'Nutzungsbedingungen',
  privacyPolicyLink: 'Datenschutzrichtlinie',
  termsSeparator: ' und ',
  restoreMenuTitle: 'Identitätsschlüssel wiederherstellen',
  restoreMenuSubtitle:
    'Wähle die Art der Wiederherstellung des Identitätsschlüssels',
  restoreFromCloudTitle: 'Aus iCloud wiederherstellen',
  restoreFromCloudDescription:
    'Stelle deinen Identitätsschlüssel aus einem iCloud-Backup wieder her',
  restoreUsingCredentialsTitle:
    'Mit Wiederherstellungsdaten wiederherstellen',
  restoreUsingCredentialsDescription:
    'Mit Wiederherstellungscode und Wiederherstellungsschlüssel-ID wiederherstellen',
  restoreSuccessTitle: 'Herzlichen Glückwunsch',
  restoreSuccessDescription:
    'Dein Identitätsschlüssel wurde wiederhergestellt. Du kannst jetzt sicher auf dein Konto zugreifen.',
  loginButton: 'Anmelden',
  setNewPasswordTitle: 'Neues Passwort festlegen',
  setNewPasswordSubtitle:
    'Wähle ein starkes Passwort, das du noch nicht verwendet hast.',
  restoreCredentialsSubtitle:
    'Bitte gib unten deine Wiederherstellungsdaten ein',
  recoveryKeyIdPlaceholder: 'Wiederherstellungsschlüssel-ID',
  recoveryCodePlaceholder: 'Wiederherstellungscode',
  restoreButton: 'Wiederherstellen',
  identityKeyNotFoundTitle:
    'Identitätsschlüssel wurde nicht gefunden',
  identityKeyNotFoundDescription:
    'Der Identitätsschlüssel zur Wiederherstellung wurde nicht gefunden.',
  closeButton: 'Schließen',
};
