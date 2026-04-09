import { useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { ContactData } from "../types";
import { ContactItem } from "./ContactItem";
import { buildContainerStyle, buildHeaderStyle, buildListContentStyle } from "./friends-section-styles";

const MOCK_CONTACTS: ContactData[] = [
  { id: "1", username: "@mysteriox" },
  { id: "2", username: "@aliciasmith" },
  { id: "3", username: "@mysterxxx" },
  { id: "4", username: "@thesemper" },
  { id: "5", username: "@jonatanblac" },
  { id: "6", username: "@supercrypto" },
];

function keyExtractor(item: ContactData) { return item.id; }
function renderItem({ item }: { item: ContactData }) { return <ContactItem contact={item} />; }

export function FriendsSection() {
  const theme = useTheme();
  const { colors } = theme;
  const containerStyle = useMemo(() => buildContainerStyle(theme), [theme]);
  const headerStyle = useMemo(() => buildHeaderStyle(theme), [theme]);
  const listStyle = useMemo(() => buildListContentStyle(theme), [theme]);
  const separatorStyle = useMemo<ViewStyle>(() => ({ width: theme.scale.scaleSize(12) }), [theme.scale]);
  const Separator = useMemo(
    () => function FriendSeparator() { return <View style={separatorStyle} />; },
    [separatorStyle],
  );

  return (
    <View style={containerStyle}>
      <View style={[styles.header, headerStyle]}>
        <Text variant="caption" color={colors.secondaryText}>{translate("walletUi:friendsTitle")}</Text>
        <TouchableOpacity accessibilityLabel={translate("walletUi:viewAllLink")} accessibilityRole="button">
          <Text variant="caption" color={colors.primaryAccent}>{translate("walletUi:viewAllLink")}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={MOCK_CONTACTS} renderItem={renderItem} keyExtractor={keyExtractor}
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={listStyle} ItemSeparatorComponent={Separator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
