import { useCallback, useMemo } from "react";
import { Linking, View } from "react-native";
import type { TextStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { externalLinks } from "@ion/config";

export function TermsFooter() {
  const { colors, scale } = useTheme();

  const containerStyle = useMemo((): TextStyle => ({
    textAlign: "center",
    maxWidth: scale.scaleSize(219),
  }), [scale]);

  const handleTermsPress = useCallback(() => {
    Linking.openURL(externalLinks.termsOfService);
  }, []);

  const handlePrivacyPress = useCallback(() => {
    Linking.openURL(externalLinks.privacyPolicy);
  }, []);

  return (
    <View>
      <Text variant="caption3" color={colors.tertiaryText} style={containerStyle}>
        {translate("auth:termsAgreementPrefix")}
        <Text variant="caption3" color={colors.primaryAccent} onPress={handleTermsPress}>
          {translate("auth:termsOfServiceLink")}
        </Text>
        {translate("auth:termsSeparator")}
        <Text variant="caption3" color={colors.primaryAccent} onPress={handlePrivacyPress}>
          {translate("auth:privacyPolicyLink")}
        </Text>
      </Text>
    </View>
  );
}
