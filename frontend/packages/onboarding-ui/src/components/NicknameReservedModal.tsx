import { useMemo } from "react";
import { View } from "react-native";
import { BottomSheet, Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

export interface NicknameReservedModalProps {
  isVisible: boolean;
  onClose: () => void;
}

function buildContentStyle(scale: (n: number) => number) {
  return { alignItems: "center" as const, paddingHorizontal: scale(28), paddingTop: scale(24), paddingBottom: scale(40), gap: scale(16) };
}

function buildIconStyle(scale: (n: number) => number, bgColor: string) {
  return { width: scale(65), height: scale(65), borderRadius: scale(33), backgroundColor: bgColor, justifyContent: "center" as const, alignItems: "center" as const };
}

export function NicknameReservedModal({ isVisible, onClose }: NicknameReservedModalProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const iconStyle = useMemo(() => buildIconStyle(scale, theme.colors.primaryAccent), [scale, theme.colors]);

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} testID="nickname-reserved-modal">
      <View style={contentStyle}>
        <View style={iconStyle}>
          <Icon name="name-reserved" size={scale(32)} color={theme.colors.onPrimaryAccent} />
        </View>
        <Text variant="headline1" style={{ textAlign: "center" }}>{translate("onboarding:nicknameReservedTitle")}</Text>
        <Text variant="body2" color={theme.colors.secondaryText} style={{ textAlign: "center" }}>
          {translate("onboarding:nicknameReservedDescription")}
        </Text>
      </View>
    </BottomSheet>
  );
}
