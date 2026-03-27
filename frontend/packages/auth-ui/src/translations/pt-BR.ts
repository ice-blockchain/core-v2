import type { authEN } from './en';

export const authPTBR: Record<keyof typeof authEN, string> = {
  getStartedTitle: 'Começar',
  getStartedSubtitle:
    'Digite o nome da sua chave de identidade para entrar na sua conta',
  identityKeyNameLabel: 'Nome da chave de identidade',
  continueButton: 'Continuar',
  orDivider: 'ou',
  registerButton: 'Registrar',
  restoreIdentityKeyButton: 'Restaurar chave de identidade',
  passwordLabel: 'Senha',
  confirmPasswordLabel: 'Confirmar senha',
  registerTitle: 'Registrar',
  registerSubtitle:
    'Escolha uma senha forte para criar uma conta',
  passwordsMatchLabel: 'As senhas coincidem',
  verifyPasskeyTitle: 'Verificar com chave de acesso',
  verifyPasskeySubtitle:
    'Seu dispositivo pedirá para confirmar esta ação usando sua impressão digital, rosto ou bloqueio de tela',
  verifyPasswordTitle: 'Verificar com senha',
  verifyPasswordSubtitle:
    'Seu dispositivo pedirá sua senha para confirmar',
  verifyPasswordConfirmSubtitle:
    'Por favor, confirme sua senha para continuar.',
  confirmButton: 'Confirmar',
  identityKeyCharactersError:
    'Apenas minúsculas, números, pontos e hífens',
  enterIdentityKeyNameError: 'Digite o nome da chave de identidade',
  passwordRuleLength: 'Deve ter mais de 8 caracteres',
  passwordRuleNumber: 'Deve conter 1 número',
  passwordRuleCase: 'Letras maiúsculas e minúsculas',
  passwordRuleSpecial: 'Deve conter 1 caractere especial',
  noPasswordBenefitTitle: 'Sem senha para memorizar',
  noPasswordBenefitSubtitle:
    'Com a chave de acesso, você pode usar sua impressão digital ou rosto para entrar',
  worksOnDevicesTitle: 'Funciona em todos os seus dispositivos',
  worksOnDevicesSubtitle:
    'A chave de acesso estará automaticamente disponível nos seus dispositivos sincronizados',
  keepAccountSaferTitle: 'Mantenha sua conta mais segura',
  keepAccountSaferSubtitle:
    'A chave de acesso oferece resistência avançada contra phishing',
  securedByLabel: 'Protegido por',
  termsAgreementPrefix: 'Ao continuar, você concorda com nossos ',
  termsOfServiceLink: 'Termos de Serviço',
  privacyPolicyLink: 'Política de Privacidade',
};
