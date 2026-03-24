import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SheetHandle } from "./sheet-handle";

interface BottomSheetProps {
  children: ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <SheetHandle />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 21, 50, 0.7)",
    zIndex: 10,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 74,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    paddingTop: 20,
  },
});
