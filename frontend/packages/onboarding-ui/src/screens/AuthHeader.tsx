import { useMemo } from "react";
import { View } from "react-native";
import { Icon, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildAuthHeaderStyle, buildLogoContainerStyle } from "./profile-setup-styles";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";

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
      <OnboardingScreenTitle
        title={translate("onboarding:yourProfileTitle")}
        subtitle={translate("onboarding:customizeAccountSubtitle")}
      />
    </View>
  );
}
