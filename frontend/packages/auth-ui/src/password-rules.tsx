interface PasswordRule {
  label: string;
  isMet: boolean;
}

export type { PasswordRule };

export function buildPasswordRules(password: string): PasswordRule[] {
  return [
    { label: "Must be over 8 characters", isMet: password.length > 8 },
    { label: "Must contain 1 number", isMet: /\d/.test(password) },
    {
      label: "Uppercase and lowercase letters",
      isMet: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: "Must contain 1 special character",
      isMet: /[^a-zA-Z0-9]/.test(password),
    },
  ];
}

export function areAllPasswordRulesMet(password: string): boolean {
  return buildPasswordRules(password).every((r) => r.isMet);
}
