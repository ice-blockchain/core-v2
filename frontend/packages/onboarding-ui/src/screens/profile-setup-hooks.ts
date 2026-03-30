import { useCallback, useEffect, useRef, useState } from "react";
import type { TextInputState } from "@ion/ui";
import { fetchReservedNicknames, validateNickname, validateReferral } from "@ion/onboarding";

const NICKNAME_PATTERN = /^[a-z0-9.]+$/;
const DEBOUNCE_MS = 1000;

export interface FieldState {
  value: string;
  inputState: TextInputState;
  errorMessage?: string | undefined;
}

export interface ProfileFormState {
  name: FieldState;
  nickname: FieldState;
  referral: FieldState;
  avatarUri?: string | undefined;
  isAvatarLoading: boolean;
  isSubmitting: boolean;
  isNicknameReserved: boolean;
  isFormValid: boolean;
}

export interface ProfileFormActions {
  setName: (value: string) => void;
  setNickname: (value: string) => void;
  setReferral: (value: string) => void;
  setAvatarUri: (uri: string) => void;
  setAvatarLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  dismissReservedModal: () => void;
  checkClipboardReferral: () => void;
}

function useDebounce(callback: (v: string) => void, delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callback(value), delayMs);
  }, [callback, delayMs]);
}

async function getClipboardText(): Promise<string> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) return await navigator.clipboard.readText();
  } catch { /* not available */ }
  return "";
}

function applyNicknameResult(value: string, result: { isReserved: boolean; isAvailable: boolean }): FieldState {
  if (result.isReserved) return { value, inputState: "error", errorMessage: "Nickname is reserved" };
  if (!result.isAvailable) return { value, inputState: "error", errorMessage: "Nickname is already taken" };
  return { value, inputState: "valid" };
}

function useReservedNicknames() {
  const reservedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    fetchReservedNicknames()
      .then((result) => { reservedRef.current = result.reservedNicknames; })
      .catch(() => { /* reserved list unavailable, validation continues without it */ });
  }, []);
  return reservedRef;
}

function useNicknameField(reservedRef: React.RefObject<Set<string>>) {
  const [state, setState] = useState<FieldState>({ value: "", inputState: "empty" });
  const [isReserved, setReserved] = useState(false);

  const validate = useCallback(async (value: string) => {
    if (!NICKNAME_PATTERN.test(value)) {
      setState({ value, inputState: "error", errorMessage: "Only letters, numbers, and dots are allowed" });
      return;
    }
    try {
      const result = await validateNickname(value, reservedRef.current ?? new Set());
      if (result.isReserved) setReserved(true);
      setState(applyNicknameResult(value, result));
    } catch {
      setState({ value, inputState: "error", errorMessage: "Validation failed" });
    }
  }, [reservedRef]);

  const onChange = useCallback((value: string) => {
    const lowered = value.toLowerCase();
    setState({ value: lowered, inputState: lowered ? "focused" : "empty" });
    return lowered;
  }, []);

  return { state, onChange, validate, isReserved, setReserved };
}

function useReferralField() {
  const [state, setState] = useState<FieldState>({ value: "", inputState: "empty" });

  const validate = useCallback(async (value: string) => {
    try {
      const result = await validateReferral(value);
      setState(result.isValid
        ? { value, inputState: "valid" }
        : { value, inputState: "error", errorMessage: "Nickname doesn't exist" });
    } catch {
      setState({ value, inputState: "error", errorMessage: "Validation failed" });
    }
  }, []);

  const onChange = useCallback((value: string) => {
    const lowered = value.toLowerCase();
    setState({ value: lowered, inputState: lowered ? "focused" : "empty" });
    return lowered;
  }, []);

  const setDirect = setState;
  return { state, onChange, validate, setDirect };
}

function useClipboardCheck(setField: (s: FieldState) => void, debouncedValidate: (v: string) => void) {
  const hasChecked = useRef(false);
  return useCallback(async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    const text = await getClipboardText();
    if (text && NICKNAME_PATTERN.test(text) && text.length <= 20) {
      setField({ value: text, inputState: "focused" });
      debouncedValidate(text);
    }
  }, [setField, debouncedValidate]);
}

function useDebouncedField(onChange: (v: string) => string, validate: (v: string) => void) {
  const debounced = useDebounce(validate, DEBOUNCE_MS);
  return useCallback((v: string) => {
    const lowered = onChange(v);
    if (lowered) debounced(lowered);
  }, [onChange, debounced]);
}

function useNameField() {
  const [state, setState] = useState<FieldState>({ value: "", inputState: "empty" });
  const wasTouched = useRef(false);

  const onChange = useCallback((v: string) => {
    if (v.length > 0) wasTouched.current = true;
    if (v.length === 0 && wasTouched.current) {
      setState({ value: v, inputState: "error", errorMessage: "Cannot be empty" });
      return;
    }
    setState({ value: v, inputState: v.length > 0 ? "valid" : "empty" });
  }, []);

  return { state, onChange };
}

export function useProfileForm(): [ProfileFormState, ProfileFormActions] {
  const [avatarUri, setAvatarUri] = useState<string>();
  const [isAvatarLoading, setAvatarLoading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const nameField = useNameField();
  const reservedRef = useReservedNicknames();
  const nick = useNicknameField(reservedRef);
  const ref = useReferralField();

  const handleNickname = useDebouncedField(nick.onChange, nick.validate);
  const handleReferral = useDebouncedField(ref.onChange, ref.validate);
  const debouncedRef = useDebounce(ref.validate, DEBOUNCE_MS);
  const checkClipboard = useClipboardCheck(ref.setDirect, debouncedRef);

  return [
    {
      name: nameField.state, nickname: nick.state, referral: ref.state, avatarUri,
      isAvatarLoading, isSubmitting, isNicknameReserved: nick.isReserved,
      isFormValid: nameField.state.value.length > 0 && nick.state.inputState === "valid",
    },
    {
      setName: nameField.onChange, setNickname: handleNickname, setReferral: handleReferral,
      setAvatarUri, setAvatarLoading, setSubmitting,
      dismissReservedModal: () => nick.setReserved(false),
      checkClipboardReferral: checkClipboard,
    },
  ];
}
