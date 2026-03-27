import type { authEN } from './en';

export const authES: Record<keyof typeof authEN, string> = {
  getStartedTitle: 'Comenzar',
  getStartedSubtitle:
    'Ingresa el nombre de tu clave de identidad para iniciar sesión',
  identityKeyNameLabel: 'Nombre de clave de identidad',
  continueButton: 'Continuar',
  orDivider: 'o',
  registerButton: 'Registrarse',
  restoreIdentityKeyButton: 'Restaurar clave de identidad',
  passwordLabel: 'Contraseña',
  confirmPasswordLabel: 'Confirmar contraseña',
  registerTitle: 'Registrarse',
  registerSubtitle:
    'Elige una contraseña segura para crear una cuenta',
  passwordsMatchLabel: 'Las contraseñas coinciden',
  verifyPasskeyTitle: 'Verificar con clave de acceso',
  verifyPasskeySubtitle:
    'Tu dispositivo te pedirá confirmar esta acción usando tu huella digital, rostro o bloqueo de pantalla',
  verifyPasswordTitle: 'Verificar con contraseña',
  verifyPasswordSubtitle:
    'Tu dispositivo te pedirá tu contraseña para confirmar',
  verifyPasswordConfirmSubtitle:
    'Por favor, confirma tu contraseña para continuar.',
  confirmButton: 'Confirmar',
  identityKeyCharactersError:
    'Solo minúsculas, números, puntos y guiones',
  enterIdentityKeyNameError: 'Ingresa el nombre de clave de identidad',
  passwordRuleLength: 'Debe tener más de 8 caracteres',
  passwordRuleNumber: 'Debe contener 1 número',
  passwordRuleCase: 'Letras mayúsculas y minúsculas',
  passwordRuleSpecial: 'Debe contener 1 carácter especial',
  noPasswordBenefitTitle: 'Sin contraseña que recordar',
  noPasswordBenefitSubtitle:
    'Con la clave de acceso, puedes usar tu huella digital o rostro para iniciar sesión',
  worksOnDevicesTitle: 'Funciona en todos tus dispositivos',
  worksOnDevicesSubtitle:
    'La clave de acceso estará disponible automáticamente en tus dispositivos sincronizados',
  keepAccountSaferTitle: 'Mantén tu cuenta más segura',
  keepAccountSaferSubtitle:
    'La clave de acceso ofrece resistencia avanzada contra phishing',
  securedByLabel: 'Protegido por',
  termsAgreementPrefix: 'Al continuar, aceptas nuestros ',
  termsOfServiceLink: 'Términos de Servicio',
  privacyPolicyLink: 'Política de Privacidad',
};
