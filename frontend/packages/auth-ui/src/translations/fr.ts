import type { authEN } from './en';

export const authFR: Record<keyof typeof authEN, string> = {
  getStartedTitle: 'Commencer',
  getStartedSubtitle:
    'Entrez le nom de votre clé d\'identité pour vous connecter',
  identityKeyNameLabel: 'Nom de la clé d\'identité',
  continueButton: 'Continuer',
  orDivider: 'ou',
  registerButton: 'S\'inscrire',
  restoreIdentityKeyButton: 'Restaurer la clé d\'identité',
  passwordLabel: 'Mot de passe',
  confirmPasswordLabel: 'Confirmer le mot de passe',
  registerTitle: 'S\'inscrire',
  passkeyRegisterTitle: 'S\'inscrire avec une clé d\'accès',
  registerSubtitle:
    'Choisissez un mot de passe fort pour créer un compte',
  passwordsMatchLabel: 'Les mots de passe correspondent',
  verifyPasskeyTitle: 'Vérifier avec une clé d\'accès',
  verifyPasskeySubtitle:
    'Votre appareil vous demandera de confirmer cette action avec votre empreinte digitale, visage ou verrouillage d\'écran',
  verifyPasswordTitle: 'Vérifier avec le mot de passe',
  verifyPasswordSubtitle:
    'Votre appareil vous demandera votre mot de passe pour confirmer',
  verifyPasswordConfirmSubtitle:
    'Veuillez confirmer votre mot de passe pour continuer.',
  confirmButton: 'Confirmer',
  identityKeyCharactersError:
    'Minuscules, chiffres, points et tirets uniquement',
  identityKeyMaxLengthError: 'Le nom de la clé d\'identité est trop long',
  enterIdentityKeyNameError: 'Entrez le nom de la clé d\'identité',
  passwordRuleLength: 'Doit contenir plus de 8 caractères',
  passwordRuleNumber: 'Doit contenir 1 chiffre',
  passwordRuleCase: 'Lettres majuscules et minuscules',
  passwordRuleSpecial: 'Doit contenir 1 caractère spécial',
  noPasswordBenefitTitle: 'Aucun mot de passe à retenir',
  noPasswordBenefitSubtitle:
    'Utilisez votre empreinte digitale ou votre visage pour vous connecter facilement et en toute sécurité',
  worksOnDevicesTitle: 'Fonctionne sur tous vos appareils',
  worksOnDevicesSubtitle:
    'Votre clé d\'accès est automatiquement disponible sur tous les appareils synchronisés',
  keepAccountSaferTitle: 'Protection renforcée du compte',
  keepAccountSaferSubtitle:
    'Les clés d\'accès offrent une protection avancée contre le phishing',
  securedByLabel: 'Sécurisé par',
  termsAgreementPrefix: 'En continuant, vous acceptez nos ',
  termsOfServiceLink: 'Conditions d\'utilisation',
  privacyPolicyLink: 'Politique de confidentialité',
  termsSeparator: ' et ',
  restoreMenuTitle: 'Restaurer la clé d\'identité',
  restoreMenuSubtitle:
    'Sélectionnez le type de récupération de la clé d\'identité',
  restoreFromCloudTitle: 'Restaurer depuis iCloud',
  restoreFromCloudDescription:
    'Restaurez votre clé d\'identité à partir d\'une sauvegarde iCloud',
  restoreUsingCredentialsTitle:
    'Restaurer avec les identifiants de récupération',
  restoreUsingCredentialsDescription:
    'Restaurer avec le code de récupération et l\'ID de clé de récupération',
  restoreSuccessTitle: 'Félicitations',
  restoreSuccessDescription:
    'Votre clé d\'identité a été restaurée. Vous pouvez maintenant accéder à votre compte en toute sécurité.',
  loginButton: 'Se connecter',
  setNewPasswordTitle: 'Définir un nouveau mot de passe',
  setNewPasswordSubtitle:
    'Choisissez un mot de passe fort que vous n\'avez pas encore utilisé.',
  restoreCredentialsSubtitle:
    'Veuillez entrer vos identifiants de récupération ci-dessous',
  recoveryKeyIdPlaceholder: 'ID de clé de récupération',
  recoveryCodePlaceholder: 'Code de récupération',
  restoreButton: 'Restaurer',
  identityKeyNotFoundTitle:
    'Clé d\'identité introuvable',
  identityKeyNotFoundDescription:
    'La clé d\'identité pour la récupération n\'a pas été trouvée.',
  closeButton: 'Fermer',
  errorUserNotFound: 'Compte introuvable. Vérifiez le nom de votre clé d\'identité.',
  errorUserAlreadyExists: 'Cette clé d\'identité est déjà prise.',
  errorInvalidCredentials: 'Mot de passe incorrect. Réessayez.',
  errorPasskeyCancelled: 'La vérification par clé d\'accès a été annulée.',
  errorPasskeyNotAvailable: 'La clé d\'accès n\'est pas disponible sur cet appareil.',
  errorPasskeyValidationFailed: 'La validation de la clé d\'accès a échoué. Réessayez.',
  errorNetworkError: 'La connexion a échoué. Vérifiez votre connexion internet et réessayez.',
  errorUserDeactivated: 'Ce compte a été désactivé.',
  errorTokenExpired: 'Session expirée. Veuillez vous reconnecter.',
  errorUnauthenticated: 'Authentification requise. Veuillez vous connecter.',
  errorUnknown: 'Une erreur est survenue. Veuillez réessayer.',
  identityKeyNameNoteModalTitle: 'Information',
  identityKeyNameNoteTitle: 'Nom de la clé d\'identité',
  identityKeyNameNoteDescription:
    'Considérez le nom de votre clé d\'identité comme un identifiant unique de votre compte. Vous en aurez besoin pour vous connecter et récupérer votre compte, alors conservez-le en sécurité et ne l\'oubliez pas.',
  identityKeyNameNoteSecuredBy:
    'Utilisez-le pour vous connecter à toute application sécurisée par',
};
