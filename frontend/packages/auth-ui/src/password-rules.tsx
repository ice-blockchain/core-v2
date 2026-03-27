import { translate } from "@ion/localization";

interface PasswordRule {
  label: string;
  isMet: boolean;
}

export type { PasswordRule };

export function buildPasswordRules(password: string): PasswordRule[] {
  return [
    { label: translate("auth:passwordRuleLength"), isMet: password.length > 8 },
    { label: translate("auth:passwordRuleNumber"), isMet: /\d/.test(password) },
    {
      label: translate("auth:passwordRuleCase"),
      isMet: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: translate("auth:passwordRuleSpecial"),
      isMet: /[^a-zA-Z0-9]/.test(password),
    },
  ];
}

export function areAllPasswordRulesMet(password: string): boolean {
  return buildPasswordRules(password).every((r) => r.isMet);
}
