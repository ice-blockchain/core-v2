"use client";

import type { CSSProperties, ReactNode } from "react";
import { SheetHandle } from "@/components/sheet-handle";

interface BottomSheetProps {
  children: ReactNode;
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(8, 21, 50, 0.7)",
  zIndex: 10,
};

const sheetStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  top: 74,
  backgroundColor: "#FFFFFF",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: 20,
  overflowY: "auto",
};

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div style={backdropStyle}>
      <div style={sheetStyle}>
        <SheetHandle />
        {children}
      </div>
    </div>
  );
}
