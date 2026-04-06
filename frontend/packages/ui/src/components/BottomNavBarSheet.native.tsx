import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator } from "./HorizontalSeparator";
import { Text } from "./Text";
import { BottomNavBarSheetActionRow } from "./BottomNavBarSheetActionRow";
import { useTheme } from "../theme/ThemeProvider";
import type { BottomNavBarSheetProps } from "./bottom-nav-bar-types";

function useSheetAppearance() {
  const theme = useTheme();
  const radius = theme.scale.scaleRadius(30);
  const bg = useMemo(() => ({ backgroundColor: theme.colors.secondaryBackground, borderTopLeftRadius: radius, borderTopRightRadius: radius }), [theme.colors.secondaryBackground, radius]);
  const handle = useMemo(() => ({ backgroundColor: theme.colors.sheetLine }), [theme.colors.sheetLine]);
  return { bg, handle };
}

function SheetHeader({ title }: { title: string }) {
  const scale = useTheme().scale.scaleSize;
  const style = useMemo(() => ({ paddingTop: scale(20), paddingBottom: scale(16), alignItems: "center" as const }), [scale]);
  return <View style={style}><Text variant="subtitle">{title}</Text></View>;
}

function renderBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />;
}

function useSheetPresenter(isVisible: boolean, modalRef: React.RefObject<BottomSheetModal | null>) {
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => modalRef.current?.present());
    }
  }, [isVisible, modalRef]);
}

export function BottomNavBarSheet({ isVisible, onClose, title, actions }: BottomNavBarSheetProps) {
  const scale = useTheme().scale.scaleSize;
  const insets = useSafeAreaInsets();
  const { bg, handle } = useSheetAppearance();
  const modalRef = useRef<BottomSheetModal>(null);
  const bottomStyle = useMemo(() => ({ paddingBottom: insets.bottom }), [insets.bottom]);
  useSheetPresenter(isVisible, modalRef);

  const handleAnimate = useCallback((_from: number, to: number) => {
    if (to === -1) onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <BottomSheetModal ref={modalRef} enableDynamicSizing enablePanDownToClose onAnimate={handleAnimate} backdropComponent={renderBackdrop} backgroundStyle={bg} handleIndicatorStyle={handle}>
      <BottomSheetView style={bottomStyle}>
        <SheetHeader title={title} />
        <View style={{ gap: scale(12) }}>
          {actions.map((action, index) => (
            <Fragment key={action.iconName}>
              {index > 0 ? <HorizontalSeparator /> : null}
              <BottomNavBarSheetActionRow action={action} />
            </Fragment>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
