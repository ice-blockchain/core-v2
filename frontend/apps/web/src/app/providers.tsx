"use client";

import { ThemeProvider } from "@ion/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
