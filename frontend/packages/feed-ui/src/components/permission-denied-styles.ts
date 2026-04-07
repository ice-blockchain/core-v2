import type { ViewStyle } from 'react-native';

export function buildDeniedContainerStyle(): ViewStyle {
  return {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function buildDeniedHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: 'center',
    gap: scale(20),
    paddingTop: scale(65),
  };
}

export function buildDeniedBodyStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(28),
  };
}

export function buildDeniedIconCircleStyle(scale: (n: number) => number, accentColor: string): ViewStyle {
  return {
    width: scale(65),
    height: scale(65),
    borderRadius: scale(33),
    backgroundColor: accentColor,
    alignItems: 'center',
    justifyContent: 'center',
  };
}
