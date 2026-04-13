import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { Text, TextInput, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { IconName, TextInputState } from "@ion/ui";
import type { StyleProp, ViewStyle } from "react-native";

type SendState = "send" | "sending" | "countdown" | "retry";

const COUNTDOWN_DURATION = 60;

interface TfaInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  prefixIcon: IconName;
  hasSendAction: boolean;
  onSend: () => void;
  state?: TextInputState;
  errorMessage?: string;
  style?: StyleProp<ViewStyle>;
}

function useCountdownTimer() {
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startTimer = useCallback((onComplete: () => void) => {
    setCountdown(COUNTDOWN_DURATION);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearTimer(); onComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  return { countdown, startTimer };
}

function useSendCountdown(onSend: () => void) {
  const [sendState, setSendState] = useState<SendState>("send");
  const { countdown, startTimer } = useCountdownTimer();

  const handleSend = useCallback(() => {
    if (sendState === "sending" || sendState === "countdown") return;
    setSendState("sending");
    onSend();
    setSendState("countdown");
    startTimer(() => setSendState("retry"));
  }, [sendState, onSend, startTimer]);

  return { sendState, countdown, handleSend };
}

function SendActionSuffix({ sendState, countdown, onPress }: {
  sendState: SendState;
  countdown: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  if (sendState === "sending") {
    return <ActivityIndicator size="small" color={colors.primaryAccent} />;
  }
  if (sendState === "countdown") {
    return (
      <Text variant="caption" color={colors.tertiaryText}>
        {translate("auth:tfaCountdownLabel", { seconds: countdown })}
      </Text>
    );
  }
  const label = sendState === "send"
    ? translate("auth:tfaSendButton")
    : translate("auth:tfaRetryButton");

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text variant="caption" color={colors.primaryAccent}>{label}</Text>
    </Pressable>
  );
}

export function TfaInput(props: TfaInputProps) {
  const { sendState, countdown, handleSend } = useSendCountdown(props.onSend);

  const suffix = props.hasSendAction
    ? <SendActionSuffix sendState={sendState} countdown={countdown} onPress={handleSend} />
    : undefined;

  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      prefixIcon={props.prefixIcon}
      suffixIcon={suffix}
      keyboardType="numeric"
      autoCorrect={false}
      autoCapitalize="none"
      {...(props.state ? { state: props.state, errorMessage: props.errorMessage } : {})}
      style={props.style}
    />
  );
}
