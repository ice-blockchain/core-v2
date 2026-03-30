import type { ReactNode } from "react";

export function Portal({ children }: { children?: ReactNode; hostName?: string }) {
  return <>{children}</>;
}

export function PortalHost(_: { name: string }) {
  return null;
}

export function PortalProvider({ children }: { children?: ReactNode }) {
  return <div style={{ flex: 1 }}>{children}</div>;
}

export function usePortal() {
  return { addPortal: () => {}, removePortal: () => {} };
}
