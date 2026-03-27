import type { authEN } from './en';

export const authPT: Record<keyof typeof authEN, string> = {
  getStartedTitle: 'Começar',
  getStartedSubtitle:
    'Digite o nome da sua chave de identidade para entrar na sua conta',
  identityKeyNameLabel: 'Nome da chave de identidade',
  continueButton: 'Continuar',
  orDivider: 'ou',
  registerButton: 'Registrar',
  restoreIdentityKeyButton: 'Restaurar chave de identidade',
  passwordLabel: 'Palavra-passe',
  confirmPasswordLabel: 'Confirmar palavra-passe',
  registerTitle: 'Registar',
  registerSubtitle:
    'Escolha uma palavra-passe forte para criar uma conta',
  passwordsMatchLabel: 'As palavras-passe coincidem',
  verifyPasskeyTitle: 'Verificar com chave de acesso',
  verifyPasskeySubtitle:
    'O seu dispositivo pedirá para confirmar esta ação usando a sua impressão digital, rosto ou bloqueio de ecrã',
  verifyPasswordTitle: 'Verificar com palavra-passe',
  verifyPasswordSubtitle:
    'O seu dispositivo pedirá a sua palavra-passe para confirmar',
  verifyPasswordConfirmSubtitle:
    'Por favor, confirme a sua palavra-passe para continuar.',
  confirmButton: 'Confirmar',
  identityKeyCharactersError:
    'Apenas minúsculas, números, pontos e hífens',
  enterIdentityKeyNameError: 'Introduza o nome da chave de identidade',
  passwordRuleLength: 'Deve ter mais de 8 caracteres',
  passwordRuleNumber: 'Deve conter 1 número',
  passwordRuleCase: 'Letras maiúsculas e minúsculas',
  passwordRuleSpecial: 'Deve conter 1 caractere especial',
  noPasswordBenefitTitle: 'Sem palavra-passe para memorizar',
  noPasswordBenefitSubtitle:
    'Com a chave de acesso, pode usar a impressão digital ou rosto para entrar',
  worksOnDevicesTitle: 'Funciona em todos os seus dispositivos',
  worksOnDevicesSubtitle:
    'A chave de acesso estará automaticamente disponível nos seus dispositivos sincronizados',
  keepAccountSaferTitle: 'Mantenha a sua conta mais segura',
  keepAccountSaferSubtitle:
    'A chave de acesso oferece resistência avançada contra phishing',
  securedByLabel: 'Protegido por',
  termsAgreementPrefix: 'Ao continuar, concorda com os nossos ',
  termsOfServiceLink: 'Termos de Serviço',
  privacyPolicyLink: 'Política de Privacidade',
};
