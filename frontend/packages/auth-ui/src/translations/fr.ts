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
  enterIdentityKeyNameError: 'Entrez le nom de la clé d\'identité',
  passwordRuleLength: 'Doit contenir plus de 8 caractères',
  passwordRuleNumber: 'Doit contenir 1 chiffre',
  passwordRuleCase: 'Lettres majuscules et minuscules',
  passwordRuleSpecial: 'Doit contenir 1 caractère spécial',
  noPasswordBenefitTitle: 'Aucun mot de passe à retenir',
  noPasswordBenefitSubtitle:
    'Avec la clé d\'accès, vous pouvez utiliser votre empreinte digitale ou votre visage pour vous connecter',
  worksOnDevicesTitle: 'Fonctionne sur tous vos appareils',
  worksOnDevicesSubtitle:
    'La clé d\'accès sera automatiquement disponible sur vos appareils synchronisés',
  keepAccountSaferTitle: 'Gardez votre compte plus sûr',
  keepAccountSaferSubtitle:
    'La clé d\'accès offre une résistance avancée contre le phishing',
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
};
