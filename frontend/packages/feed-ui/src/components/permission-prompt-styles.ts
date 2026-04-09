import type { ViewStyle } from 'react-native';

export function buildPromptContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: 'center',
    paddingTop: scale(16),
    paddingHorizontal: scale(16),
  };
}

export function buildPromptTextContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: 'center',
    gap: scale(8),
    width: scale(320),
    paddingVertical: scale(16),
  };
}

export function buildPromptButtonRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: 'row',
    gap: scale(15),
    width: '100%',
    paddingTop: scale(16),
  };
}
