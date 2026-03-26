import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { TextInputState } from "./text-input-types";
import { resolveBorderColors, buildContainerStyle, buildSeparatorStyle, buildInputStyle } from "./text-input-styles";

export function useDebouncedCallback(callback: (text: string) => void, delayMs: number | undefined) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback((text: string) => {
    if (!delayMs) {
      callback(text);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callback(text), delayMs);
  }, [callback, delayMs]);
}

export function useTextInputStyles(visualState: TextInputState) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const borderColors = useMemo(
    () => resolveBorderColors(theme.colors, visualState),
    [theme.colors, visualState],
  );

  const containerStyle = useMemo(
    () => buildContainerStyle(borderColors.border, scale),
    [borderColors.border, scale],
  );

  const separatorStyle = useMemo(() => buildSeparatorStyle(scale), [scale]);

  const inputStyle = useMemo(
    () => buildInputStyle(scale, theme.colors.primaryText),
    [scale, theme.colors.primaryText],
  );

  return { borderColors, containerStyle, separatorStyle, inputStyle, theme, scale };
}
