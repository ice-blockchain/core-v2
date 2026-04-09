import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { emptyNftsImage } from "../assets/wallet-images";
import { buildEmptyImageStyle, buildEmptyStateStyle } from "./coins-section-styles";

export function EmptyNftsState() {
  const theme = useTheme();
  const { colors } = theme;
  const imageStyle = useMemo(() => buildEmptyImageStyle(theme), [theme]);
  const stateStyle = useMemo(() => buildEmptyStateStyle(theme), [theme]);

  return (
    <View style={[styles.container, stateStyle]}>
      <Image source={emptyNftsImage} style={imageStyle} />
      <Text variant="caption2" color={colors.tertiaryText}>
        {translate("walletUi:emptyNftsMessage")}
      </Text>
      <TouchableOpacity accessibilityLabel={translate("walletUi:receiveNftLink")} accessibilityRole="button">
        <Text variant="caption" color={colors.primaryAccent}>
          {translate("walletUi:receiveNftLink")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
});
