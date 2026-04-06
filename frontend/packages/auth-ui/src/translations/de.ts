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
  passkeyRegisterTitle: 'Mit Passkey registrieren',
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
  noPasswordBenefitTitle: 'Keine Passwörter zum Merken',
  noPasswordBenefitSubtitle:
    'Verwende deinen Fingerabdruck oder dein Gesicht, um dich einfach und sicher anzumelden',
  worksOnDevicesTitle: 'Funktioniert auf all deinen Geräten',
  worksOnDevicesSubtitle:
    'Dein Passkey ist automatisch auf allen synchronisierten Geräten verfügbar',
  keepAccountSaferTitle: 'Stärkerer Kontoschutz',
  keepAccountSaferSubtitle:
    'Passkeys bieten erweiterten Schutz gegen Phishing',
  securedByLabel: 'Gesichert durch',
  termsAgreementPrefix: 'Durch Fortfahren stimmst du unseren ',
  termsOfServiceLink: 'Nutzungsbedingungen',
  privacyPolicyLink: 'Datenschutzrichtlinie',
  termsSeparator: ' und ',
  restoreMenuTitle: 'Identitätsschlüssel wiederherstellen',
  restoreMenuSubtitle:
    'Wähle die Art der Wiederherstellung des Identitätsschlüssels',
  restoreFromCloudTitle: 'Aus {{cloudProvider}} wiederherstellen',
  restoreFromCloudDescription:
    'Stelle deinen Identitätsschlüssel aus einem {{cloudProvider}}-Backup wieder her',
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
  selectIdentityKeyNameLabel: 'Identitätsschlüssel auswählen',
  restoreButton: 'Wiederherstellen',
  identityKeyNotFoundTitle:
    'Identitätsschlüssel wurde nicht gefunden',
  identityKeyNotFoundDescription:
    'Der Identitätsschlüssel zur Wiederherstellung wurde nicht gefunden.',
  closeButton: 'Schließen',
  errorUserNotFound: 'Konto nicht gefunden. Überprüfe den Namen deines Identitätsschlüssels.',
  errorUserAlreadyExists: 'Dieser Identitätsschlüssel ist bereits vergeben.',
  errorInvalidCredentials: 'Falsches Passwort. Versuche es erneut.',
  errorPasskeyCancelled: 'Passkey-Verifizierung wurde abgebrochen.',
  errorPasskeyNotAvailable: 'Passkey ist auf diesem Gerät nicht verfügbar.',
  errorPasskeyValidationFailed: 'Passkey-Validierung fehlgeschlagen. Versuche es erneut.',
  errorNetworkError: 'Verbindung fehlgeschlagen. Überprüfe deine Internetverbindung und versuche es erneut.',
  errorUserDeactivated: 'Dieses Konto wurde deaktiviert.',
  errorTokenExpired: 'Sitzung abgelaufen. Bitte melde dich erneut an.',
  errorUnauthenticated: 'Authentifizierung erforderlich. Bitte melde dich an.',
  errorRestrictedRegion: 'Dieser Dienst ist in deiner Region nicht verfügbar.',
  errorTwoFARequired: 'Zwei-Faktor-Authentifizierung ist erforderlich.',
  errorInvalidTwoFACode: 'Ungültiger Verifizierungscode. Versuche es erneut.',
  errorTwoFANotConfigured: 'Zwei-Faktor-Authentifizierung ist nicht eingerichtet.',
  errorInvalidNickname: 'Ungültiger Nickname.',
  errorNicknameAlreadyExists: 'Dieser Nickname ist bereits vergeben.',
  errorNicknameReserved: 'Dieser Nickname ist reserviert.',
  errorInvalidRecoveryCredentials: 'Ungültige Wiederherstellungsdaten.',
  errorInvalidSignature: 'Signaturverifizierung fehlgeschlagen.',
  errorInvalidEmail: 'Ungültige E-Mail-Adresse.',
  errorPasswordFlowNotAvailable: 'Passwort-Anmeldung ist für dieses Konto nicht verfügbar.',
  errorWalletNotFound: 'Wallet nicht gefunden.',
  errorUnknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  identityKeyNameNoteModalTitle: 'Information',
  identityKeyNameNoteTitle: 'Name des Identitätsschlüssels',
  identityKeyNameNoteDescription:
    'Betrachte den Namen deines Identitätsschlüssels als eine eindeutige Kennung deines Kontos. Du brauchst ihn, um dich anzumelden und dein Konto wiederherzustellen. Bewahre ihn sicher auf und vergiss ihn nicht.',
  identityKeyNameNoteSecuredBy:
    'Verwende ihn, um dich bei jeder App anzumelden, die gesichert ist durch',
  errorInvalidIdentityKeyName: 'Ungültiger Identitätsschlüsselname.',
};
