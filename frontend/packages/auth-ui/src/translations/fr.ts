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
};
