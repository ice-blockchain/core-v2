import React, { createContext, useContext } from 'react';

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };
const defaultFrame = { x: 0, y: 0, width: 0, height: 0 };

export const SafeAreaInsetsContext = createContext(defaultInsets);
export const SafeAreaFrameContext = createContext(defaultFrame);
export const SafeAreaContext = SafeAreaInsetsContext;
export const SafeAreaConsumer = SafeAreaInsetsContext.Consumer;

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={defaultInsets}>
      <SafeAreaFrameContext.Provider value={defaultFrame}>
        {children}
      </SafeAreaFrameContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
}

export function SafeAreaListener({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SafeAreaView({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}

export function useSafeAreaInsets() {
  return useContext(SafeAreaInsetsContext);
}

export function useSafeAreaFrame() {
  return useContext(SafeAreaFrameContext);
}

export function useSafeArea() {
  return useContext(SafeAreaInsetsContext);
}

export function withSafeAreaInsets<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithSafeAreaInsetsWrapper(props: P) {
    return <WrappedComponent {...props} insets={defaultInsets} />;
  };
}

export const initialWindowMetrics = {
  insets: defaultInsets,
  frame: defaultFrame,
};

export const initialWindowSafeAreaInsets = defaultInsets;
