import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

interface CoinSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onCancel: () => void;
}

export function CoinSearchBar({ value, onChangeText, onCancel }: CoinSearchBarProps) {
  const theme = useTheme();
  const gapStyle = useMemo(() => ({ gap: theme.spacing.md }), [theme.spacing.md]);

  return (
    <View style={[styles.container, gapStyle]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={translate("walletUi:searchPlaceholder")}
        isAutoFocus
        style={styles.searchBar}
      />
      <TouchableOpacity onPress={onCancel} accessibilityLabel={translate("walletUi:cancelButton")} accessibilityRole="button">
        <Text variant="caption" color={theme.colors.primaryAccent}>
          {translate("walletUi:cancelButton")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: { flex: 1 },
});
