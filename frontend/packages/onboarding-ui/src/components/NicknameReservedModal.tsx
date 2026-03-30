import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildOverlayStyle,
  buildHandleStyle,
  buildSheetStyle,
  buildHeaderStyle,
  buildContentStyle,
  buildTextGroupStyle,
} from "./nickname-reserved-styles";

export interface NicknameReservedModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const CONTACT_EMAIL = "hi@ice.io";

function DescriptionWithEmail({ color, emailColor }: { color: string; emailColor: string }) {
  const description = translate("onboarding:nicknameReservedDescription");
  const parts = description.split(CONTACT_EMAIL);
  if (parts.length < 2) {
    return <Text variant="body2" color={color}>{description}</Text>;
  }
  return (
    <Text variant="body2" color={color}>
      {parts[0]}<Text variant="body2" color={emailColor}>{CONTACT_EMAIL}</Text>{parts[1]}
    </Text>
  );
}

function SheetBody({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const textGroupStyle = useMemo(() => buildTextGroupStyle(scale, insets.bottom), [scale, insets.bottom]);

  return (
    <>
      <View style={headerStyle}>
        <View style={{ width: scale(24) }} />
        <Text variant="subtitle">{translate("onboarding:nicknameReservedModalTitle")}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Icon name="sheet-close" size={scale(24)} color={theme.colors.tertiaryText} />
        </Pressable>
      </View>
      <View style={contentStyle}>
        <Icon name="name-reserved" size={scale(80)} color={theme.colors.secondaryText} />
        <View style={textGroupStyle}>
          <Text variant="title" style={{ textAlign: "center" }}>{translate("onboarding:nicknameReservedTitle")}</Text>
          <DescriptionWithEmail color={theme.colors.secondaryText} emailColor={theme.colors.primaryAccent} />
        </View>
      </View>
    </>
  );
}

export function NicknameReservedModal({ isVisible, onClose }: NicknameReservedModalProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const overlayStyle = useMemo(() => buildOverlayStyle(theme.colors.backgroundSheet), [theme.colors]);
  const handleStyle = useMemo(() => buildHandleStyle(scale, theme.colors.sheetLine), [scale, theme.colors]);
  const sheetStyle = useMemo(() => buildSheetStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors]);

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={overlayStyle} onPress={onClose}>
        <View style={handleStyle} />
        <Pressable style={sheetStyle} onPress={undefined}>
          <SheetBody onClose={onClose} />
        </Pressable>
      </Pressable>
    </View>
  );
}
