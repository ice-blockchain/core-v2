import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface BottomNavContextValue {
  readonly isBottomNavHidden: boolean;
  readonly setBottomNavHidden: (hidden: boolean) => void;
}

const BottomNavContext = createContext<BottomNavContextValue>({
  isBottomNavHidden: false,
  setBottomNavHidden: () => {},
});

export function BottomNavProvider({ children }: { readonly children: ReactNode }) {
  const [isBottomNavHidden, setHidden] = useState(false);

  const setBottomNavHidden = useCallback((hidden: boolean) => {
    setHidden(hidden);
  }, []);

  const value = useMemo(() => ({ isBottomNavHidden, setBottomNavHidden }), [isBottomNavHidden, setBottomNavHidden]);

  return <BottomNavContext.Provider value={value}>{children}</BottomNavContext.Provider>;
}

export function useBottomNav() {
  return useContext(BottomNavContext);
}
