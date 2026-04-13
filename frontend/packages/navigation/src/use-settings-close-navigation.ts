import { createContext, useContext } from 'react';

export type SettingsCloseAndNavigate = (route: string) => void;

export const SettingsCloseNavigationContext = createContext<SettingsCloseAndNavigate>(() => {});

export function useSettingsCloseNavigation(): SettingsCloseAndNavigate {
  return useContext(SettingsCloseNavigationContext);
}
