import { useCallback, useMemo, useState } from "react";
import { translate } from "@ion/localization";

const IDENTITY_KEY_PATTERN = /^[a-z0-9._-]+$/;
const IDENTITY_KEY_MAX_LENGTH = 64;

export function isValidIdentityKeyName(value: string): boolean {
  return value.length > 0 && value.length <= IDENTITY_KEY_MAX_LENGTH && IDENTITY_KEY_PATTERN.test(value);
}

export function validateIdentityKeyName(value: string): string | null {
  if (value.length === 0) return null;
  if (!IDENTITY_KEY_PATTERN.test(value)) {
    return translate("auth:identityKeyCharactersError");
  }
  if (value.length > IDENTITY_KEY_MAX_LENGTH) {
    return translate("auth:identityKeyMaxLengthError");
  }
  return null;
}

export function useIdentityKeyValidation(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [submitted, setSubmitted] = useState(false);
  const charError = useMemo(() => validateIdentityKeyName(value), [value]);
  const emptyError = submitted && value.length === 0 ? translate("auth:enterIdentityKeyNameError") : null;

  const validate = useCallback(() => {
    setSubmitted(true);
    return value.length > 0 && !charError;
  }, [value, charError]);

  return { value, setValue, errorMessage: charError ?? emptyError, validate };
}
