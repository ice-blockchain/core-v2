import { useMemo } from 'react';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useTheme } from '@ion/ui';

export function useNavigationTheme() {
  const theme = useTheme();
  const isDark = theme.colorMode === 'dark';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  return useMemo(() => ({
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.primaryAccent,
      background: theme.colors.primaryBackground,
      card: theme.colors.secondaryBackground,
      text: theme.colors.primaryText,
      border: theme.colors.strokeElements,
      notification: theme.colors.attentionRed,
    },
  }), [baseTheme, isDark, theme.colors]);
}
