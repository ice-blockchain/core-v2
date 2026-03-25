import type { CSSProperties } from "react";

const handleStyle: CSSProperties = {
  width: 50,
  height: 3,
  borderRadius: 5,
  backgroundColor: "#B8BCCA",
  margin: "0 auto",
};

export function SheetHandle() {
  return <div style={handleStyle} />;
}
