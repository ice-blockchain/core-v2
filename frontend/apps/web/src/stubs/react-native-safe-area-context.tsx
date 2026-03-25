import React, { createContext, useContext } from 'react';

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };
const InsetContext = createContext(defaultInsets);

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return <InsetContext.Provider value={defaultInsets}>{children}</InsetContext.Provider>;
}

export function useSafeAreaInsets() {
  return useContext(InsetContext);
}

export function SafeAreaView({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}
