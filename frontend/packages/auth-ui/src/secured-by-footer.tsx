import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
        fill={color}
        opacity={0.2}
      />
      <Path
        d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SecuredByFooter() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="caption" color={colors.secondaryText}>{translate("auth:securedByLabel")}</Text>
      <ShieldIcon color={colors.primaryAccent} />
      <Text variant="caption" color={colors.primaryAccent}>Identity.io</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
