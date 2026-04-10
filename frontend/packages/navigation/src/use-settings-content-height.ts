import { createContext, useCallback, useContext } from 'react';

export type RouteHeightReporter = (route: string, height: number) => void;

export const SettingsHeightContext = createContext<RouteHeightReporter>(() => {});

export function useReportSettingsContentHeight(route: string) {
  const report = useContext(SettingsHeightContext);
  return useCallback((_width: number, height: number) => { report(route, height); }, [report, route]);
}
