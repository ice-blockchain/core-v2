import { useMemo } from "react";
import { View } from "react-native";
import type { TextStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

export function TermsFooter() {
  const { colors } = useTheme();

  const containerStyle = useMemo((): TextStyle => ({
    textAlign: "center",
    maxWidth: 219,
  }), []);

  return (
    <View>
      <Text variant="caption3" color={colors.tertiaryText} style={containerStyle}>
        {translate("auth:termsAgreementPrefix")}
        <Text variant="caption3" color={colors.primaryAccent}>{translate("auth:termsOfServiceLink")}</Text>
        {translate("auth:termsSeparator")}
        <Text variant="caption3" color={colors.primaryAccent}>{translate("auth:privacyPolicyLink")}</Text>
      </Text>
    </View>
  );
}
