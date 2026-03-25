import { useCallback, useMemo, useState } from "react";

const IDENTITY_KEY_PATTERN = /^[a-z0-9._-]+$/;

export function validateIdentityKeyName(value: string): string | null {
  if (value.length === 0) return null;
  if (!IDENTITY_KEY_PATTERN.test(value)) {
    return "Lowercase, numbers, dots, hyphens only";
  }
  return null;
}

export function useIdentityKeyValidation() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const charError = useMemo(() => validateIdentityKeyName(value), [value]);
  const emptyError = submitted && value.length === 0 ? "Enter identity key name" : null;

  const validate = useCallback(() => {
    setSubmitted(true);
    return value.length > 0 && !charError;
  }, [value, charError]);

  return { value, setValue, errorMessage: charError ?? emptyError, validate };
}
