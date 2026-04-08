import { useState } from "react";
import { areAllPasswordRulesMet, buildPasswordRules } from "./password-rules";

export function usePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isPasswordValid = areAllPasswordRulesMet(password);
  const hasConfirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const isPasswordEmpty = password.length === 0 && confirmPassword.length === 0;
  const isPasswordFormValid = isPasswordValid && isPasswordMatch;

  return {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    isPasswordFormValid, isPasswordEmpty, hasConfirmMismatch,
    passwordRules: buildPasswordRules(password),
    confirmPasswordRules: buildPasswordRules(confirmPassword),
  };
}
