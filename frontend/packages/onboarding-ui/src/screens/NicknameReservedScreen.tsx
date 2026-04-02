import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet } from "@ion/navigation";
import { buildContentStyle, buildTextGroupStyle } from "../components/nickname-reserved-styles";

const CONTACT_EMAIL = "hi@ice.io";
const CENTER_TEXT = { textAlign: "center" } as const;

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

function NicknameReservedContent() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const textGroupStyle = useMemo(() => buildTextGroupStyle(scale, insets.bottom), [scale, insets.bottom]);

  return (
    <View style={contentStyle}>
      <Icon name="name-reserved" size={scale(80)} color={theme.colors.secondaryText} />
      <View style={textGroupStyle}>
        <Text variant="title" style={CENTER_TEXT}>{translate("onboarding:nicknameReservedTitle")}</Text>
        <DescriptionWithEmail color={theme.colors.secondaryText} emailColor={theme.colors.primaryAccent} />
      </View>
    </View>
  );
}

export function NicknameReservedScreen() {
  return (
    <DynamicSheet title={translate("onboarding:nicknameReservedModalTitle")}>
      <NicknameReservedContent />
    </DynamicSheet>
  );
}
