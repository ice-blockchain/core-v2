import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useTheme } from "../theme/ThemeProvider";
import { FullscreenPortal } from "./fullscreen-portal";
import type { FullscreenBottomSheetProps, FullscreenBottomSheetRef } from "./fullscreen-bottom-sheet-types";

function useSheetAppearance() {
  const theme = useTheme();
  const backgroundStyle = useMemo(
    () => ({ backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors.secondaryBackground],
  );
  const handleIndicatorStyle = useMemo(
    () => ({ backgroundColor: theme.colors.sheetLine }),
    [theme.colors.sheetLine],
  );
  return { backgroundStyle, handleIndicatorStyle };
}

const DEFAULT_SNAP_POINTS = ["50%"];

function useBackdropRenderer() {
  return useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, [],
  );
}

interface SheetContentProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  snapPoints: Array<string | number> | undefined;
  enableDynamicSizing: boolean | undefined;
  enablePanDownToClose: boolean;
  onClose: () => void;
  children: ReactNode;
}

function SheetContent({ sheetRef, snapPoints, enableDynamicSizing, enablePanDownToClose, onClose, children }: SheetContentProps) {
  const { backgroundStyle, handleIndicatorStyle } = useSheetAppearance();
  const renderBackdrop = useBackdropRenderer();
  const sizingProps = enableDynamicSizing
    ? { enableDynamicSizing: true as const }
    : { snapPoints: snapPoints ?? DEFAULT_SNAP_POINTS };

  return (
    <BottomSheet
      ref={sheetRef}
      {...sizingProps}
      enablePanDownToClose={enablePanDownToClose}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
    >
      {children}
    </BottomSheet>
  );
}

export const FullscreenBottomSheet = forwardRef<FullscreenBottomSheetRef, FullscreenBottomSheetProps>(
  function FullscreenBottomSheet(props, ref) {
    const { isVisible, onClose, snapPoints, enableDynamicSizing, enablePanDownToClose = true, children } = props;
    const sheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => sheetRef.current?.snapToIndex(index),
      close: () => sheetRef.current?.close(),
    }), []);

    if (!isVisible) return null;

    return (
      <FullscreenPortal>
        <SheetContent
          sheetRef={sheetRef}
          snapPoints={snapPoints}
          enableDynamicSizing={enableDynamicSizing}
          enablePanDownToClose={enablePanDownToClose}
          onClose={onClose}
        >
          {children}
        </SheetContent>
      </FullscreenPortal>
    );
  },
);
