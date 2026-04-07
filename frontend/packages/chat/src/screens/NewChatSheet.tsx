import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { SheetBackdrop, SheetBackground, SheetHandle, useTheme } from "@ion/ui";
import { NewChatSheetContent } from "./new-chat-sheet-content";

const SNAP_POINTS = ["92%"];

interface NewChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
}

export function NewChatSheet({ isVisible, onClose }: NewChatSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (!isVisible) return undefined;
    const frame = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(frame);
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClose = useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  if (!isVisible) return null;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
      backdropComponent={SheetBackdrop}
      backgroundComponent={SheetBackground}
      handleComponent={SheetHandle}
    >
      <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: theme.colors.secondaryBackground }}>
        <NewChatSheetContent onClose={handleContentClose} />
      </View>
    </BottomSheetModal>
  );
}
