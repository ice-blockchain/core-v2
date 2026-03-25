import { useMemo } from "react";
import { View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { buildAuthHeaderStyle, buildLogoContainerStyle } from "./profile-setup-styles";

export function AuthHeader() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildAuthHeaderStyle(scale), [scale]);
  const logoStyle = useMemo(() => buildLogoContainerStyle(scale, theme.colors), [scale, theme.colors]);

  return (
    <View style={headerStyle}>
      <View style={logoStyle}>
        <Icon name="login-ice-logo" size={scale(44)} color={theme.colors.onPrimaryAccent} />
      </View>
      <View style={{ alignItems: "center", gap: scale(12) }}>
        <Text variant="headline1">Your profile</Text>
        <Text variant="body2" color={theme.colors.tertiaryText}>Customize your account</Text>
      </View>
    </View>
  );
}
