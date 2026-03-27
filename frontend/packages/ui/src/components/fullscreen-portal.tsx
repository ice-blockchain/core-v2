import { createContext, useContext, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

type RegisterFn = (id: string, node: ReactNode) => void;
type UnregisterFn = (id: string) => void;

interface PortalContextValue {
  register: RegisterFn;
  unregister: UnregisterFn;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function FullscreenPortalHost({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Map<string, ReactNode>>(new Map());

  const register: RegisterFn = useCallback((id, node) => {
    setEntries((prev) => new Map(prev).set(id, node));
  }, []);

  const unregister: UnregisterFn = useCallback((id) => {
    setEntries((prev) => { const next = new Map(prev); next.delete(id); return next; });
  }, []);

  const value = useMemo(() => ({ register, unregister }), [register, unregister]);
  const portalNodes = Array.from(entries.entries());

  return (
    <PortalContext.Provider value={value}>
      {children}
      {portalNodes.map(([id, node]) => (
        <View key={id} style={styles.overlay}>{node}</View>
      ))}
    </PortalContext.Provider>
  );
}

export function FullscreenPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(PortalContext);
  const id = useId();
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    ctx?.register(id, childrenRef.current);
  });

  useEffect(() => () => ctx?.unregister(id), [ctx, id]);

  return null;
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
});
