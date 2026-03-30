import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Portal, PortalHost, PortalProvider } from "@gorhom/portal";

const PORTAL_HOST_NAME = "fullscreen-overlay";

export function FullscreenPortalHost({ children }: { children: ReactNode }) {
  return (
    <PortalProvider>
      {children}
      <PortalHost name={PORTAL_HOST_NAME} />
    </PortalProvider>
  );
}

export function FullscreenPortal({ children }: { children: ReactNode }) {
  return (
    <Portal hostName={PORTAL_HOST_NAME}>
      <View style={styles.overlay}>{children}</View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
});
