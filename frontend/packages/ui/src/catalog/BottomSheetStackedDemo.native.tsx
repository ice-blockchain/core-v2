import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { FullscreenBottomSheet } from "../components/FullscreenBottomSheet";
import { useSheetStyles } from "./bottom-sheet-demo-styles";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

function useSheetAppearance() {
  const { theme } = useSheetStyles();
  return {
    backgroundStyle: { backgroundColor: theme.colors.secondaryBackground },
    handleIndicatorStyle: { backgroundColor: theme.colors.sheetLine },
    backdropComponent: useCallback(
      (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, [],
    ),
  };
}

function SecondSheet({ onDismiss }: { onDismiss: () => void }) {
  const { safeBottomStyle, theme } = useSheetStyles();
  const appearance = useSheetAppearance();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const f = requestAnimationFrame(() => ref.current?.present());
    return () => cancelAnimationFrame(f);
  }, []);

  return (
    <BottomSheetModal ref={ref} snapPoints={["50%"]} stackBehavior="push" enablePanDownToClose onDismiss={onDismiss} {...appearance}>
      <BottomSheetView style={{ ...safeBottomStyle, padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="headline2">Second Sheet (50%)</Text>
        <Text variant="body">Stacked on top of the first sheet.</Text>
        <Button height={44} color="secondary" label="Close Top Sheet" onPress={() => ref.current?.dismiss()} />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export function BottomSheetStackedDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const { safeBottomStyle, theme } = useSheetStyles();
  const [secondVisible, setSecondVisible] = useState(false);

  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={() => { setSecondVisible(false); onClose(); }} snapPoints={["80%"]}>
      <View style={{ ...safeBottomStyle, padding: theme.spacing.md, gap: theme.spacing.sm, flex: 1 }}>
        <Text variant="headline2">First Sheet (80%)</Text>
        <Text variant="body">Press to stack another sheet on top.</Text>
        <View style={{ flex: 1 }} />
        <Button height={56} color="primary" label="Open Another Bottom Sheet" onPress={() => setSecondVisible(true)} />
      </View>
      {secondVisible && <SecondSheet onDismiss={() => setSecondVisible(false)} />}
    </FullscreenBottomSheet>
  );
}
