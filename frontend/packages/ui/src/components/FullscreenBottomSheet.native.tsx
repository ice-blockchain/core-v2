import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useTheme } from "../theme/ThemeProvider";
import type { FullscreenBottomSheetProps, FullscreenBottomSheetRef } from "./fullscreen-bottom-sheet-types";

function useSheetAppearance() {
  const theme = useTheme();
  const topRadius = theme.scale.scaleRadius(30);
  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.secondaryBackground,
      borderTopLeftRadius: topRadius,
      borderTopRightRadius: topRadius,
    }),
    [theme.colors.secondaryBackground, topRadius],
  );
  const handleIndicatorStyle = useMemo(
    () => ({ backgroundColor: theme.colors.sheetLine }),
    [theme.colors.sheetLine],
  );
  return { backgroundStyle, handleIndicatorStyle };
}

function useBackdropRenderer() {
  return useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, [],
  );
}

function usePresentOnMount(modalRef: React.RefObject<BottomSheetModal | null>, isVisible: boolean) {
  useEffect(() => {
    if (!isVisible) return undefined;
    const f = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(f);
  }, [isVisible, modalRef]);
}

const DEFAULT_SNAP_POINTS = ["50%"];

export const FullscreenBottomSheet = forwardRef<FullscreenBottomSheetRef, FullscreenBottomSheetProps>(
  function FullscreenBottomSheet(props, ref) {
    const { isVisible, onClose, snapPoints, enableDynamicSizing, enablePanDownToClose = true, children } = props;
    const { backgroundStyle, handleIndicatorStyle } = useSheetAppearance();
    const renderBackdrop = useBackdropRenderer();
    const modalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => modalRef.current?.present(),
      dismiss: () => modalRef.current?.dismiss(),
      snapToIndex: (index: number) => modalRef.current?.snapToIndex(index),
    }), []);
    usePresentOnMount(modalRef, isVisible);

    if (!isVisible) return null;
    const sizingProps = enableDynamicSizing
      ? { enableDynamicSizing: true as const }
      : { snapPoints: snapPoints ?? DEFAULT_SNAP_POINTS, enableDynamicSizing: false as const };

    return (
      <BottomSheetModal
        ref={modalRef}
        {...sizingProps}
        index={0}
        enablePanDownToClose={enablePanDownToClose}
        onDismiss={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
      >
        {children}
      </BottomSheetModal>
    );
  },
);
