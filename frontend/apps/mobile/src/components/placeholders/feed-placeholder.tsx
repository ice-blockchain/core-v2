import { View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

export function FeedPlaceholder() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primaryBackground }}>
      <Text variant="headline2">{translate("mainShell:feedTab")}</Text>
    </View>
  );
}
