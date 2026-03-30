import type { ReactNode } from "react";
import { View } from "react-native";

export function Portal({ children }: { children?: ReactNode; hostName?: string }) {
  return <>{children}</>;
}

export function PortalHost(_: { name: string }) {
  return null;
}

export function PortalProvider({ children }: { children?: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export function usePortal() {
  return { addPortal: () => {}, removePortal: () => {} };
}
