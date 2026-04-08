import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface BottomNavContextValue {
  readonly isBottomNavHidden: boolean;
  readonly setBottomNavHidden: (hidden: boolean) => void;
  readonly chatBadgeCount: number;
  readonly setChatBadgeCount: (count: number) => void;
}

const BottomNavContext = createContext<BottomNavContextValue>({
  isBottomNavHidden: false,
  setBottomNavHidden: () => {},
  chatBadgeCount: 0,
  setChatBadgeCount: () => {},
});

export function BottomNavProvider({ children }: { readonly children: ReactNode }) {
  const [isBottomNavHidden, setHidden] = useState(false);
  const [chatBadgeCount, setBadgeCount] = useState(0);

  const setBottomNavHidden = useCallback((hidden: boolean) => setHidden(hidden), []);
  const setChatBadgeCount = useCallback((count: number) => setBadgeCount(count), []);

  const value = useMemo(
    () => ({ isBottomNavHidden, setBottomNavHidden, chatBadgeCount, setChatBadgeCount }),
    [isBottomNavHidden, setBottomNavHidden, chatBadgeCount, setChatBadgeCount],
  );

  return <BottomNavContext.Provider value={value}>{children}</BottomNavContext.Provider>;
}

export function useBottomNav() {
  return useContext(BottomNavContext);
}
