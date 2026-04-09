import { useMemo } from "react";
import { Image, View } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";
import { FullscreenBottomSheet, SheetCloseHeader, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { privacyIconImage, privacyIconDarkImage } from "./chat-images";

const SNAP_POINTS = ["38%"];

interface PrivacyInfoSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
}

function buildContentStyle(scale: (n: number) => number): ViewStyle {
  return { alignItems: "center", gap: scale(10), paddingHorizontal: scale(16) };
}

function buildTextContainerStyle(scale: (n: number) => number): ViewStyle {
  return { alignItems: "center", gap: scale(8), width: "100%" };
}

function buildIconStyle(scale: (n: number) => number): ImageStyle {
  const size = scale(80);
  return { width: size, height: size };
}

function PrivacyInfoContent({ onClose }: { readonly onClose: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const textContainerStyle = useMemo(() => buildTextContainerStyle(scale), [scale]);
  const iconStyle = useMemo(() => buildIconStyle(scale), [scale]);
  const icon = theme.colorMode === "dark" ? privacyIconDarkImage : privacyIconImage;

  return (
    <>
      <SheetCloseHeader title={translate("chat:informationTitle")} onClose={onClose} testID="privacy-info-close" />
      <View style={contentStyle}>
        <Image source={icon} style={iconStyle} />
        <View style={textContainerStyle}>
          <Text variant="title">{translate("chat:privacyTitle")}</Text>
          <Text variant="body2" color={theme.colors.secondaryText}>{translate("chat:privacyDescription")}</Text>
        </View>
      </View>
    </>
  );
}

export function PrivacyInfoSheet({ isVisible, onClose }: PrivacyInfoSheetProps) {
  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} snapPoints={SNAP_POINTS}>
      <PrivacyInfoContent onClose={onClose} />
    </FullscreenBottomSheet>
  );
}
