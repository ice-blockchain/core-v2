import type { ReactNode } from "react";

export function GestureHandlerRootView({ children, style }: { children?: ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}

export default { GestureHandlerRootView };
