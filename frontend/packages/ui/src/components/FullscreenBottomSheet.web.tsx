import { forwardRef, useImperativeHandle } from "react";
import { BottomSheet } from "./BottomSheet";
import type { FullscreenBottomSheetProps, FullscreenBottomSheetRef } from "./fullscreen-bottom-sheet-types";

export const FullscreenBottomSheet = forwardRef<FullscreenBottomSheetRef, FullscreenBottomSheetProps>(
  function FullscreenBottomSheet({ isVisible, onClose, children }, ref) {
    useImperativeHandle(ref, () => ({
      snapToIndex: () => {},
      close: onClose,
    }), [onClose]);

    return (
      <BottomSheet isVisible={isVisible} onClose={onClose}>
        {children}
      </BottomSheet>
    );
  },
);
