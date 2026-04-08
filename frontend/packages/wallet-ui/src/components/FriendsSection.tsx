import { useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme, colorPalette } from "@ion/ui";
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
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(() => buildContainerStyle(scale, theme.colors), [scale, theme.colors]);
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  const listStyle = useMemo(() => buildListContentStyle(scale), [scale]);
  const separatorStyle = useMemo(() => ({ width: scale(12) }), [scale]);

  return (
    <View style={containerStyle}>
      <View style={[styles.header, headerStyle]}>
        <Text variant="caption" color={colorPalette.sharkText}>{translate("walletUi:friendsTitle")}</Text>
        <TouchableOpacity>
          <Text variant="caption" color={theme.colors.primaryAccent}>{translate("walletUi:viewAllLink")}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={MOCK_CONTACTS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={listStyle}
        ItemSeparatorComponent={() => <View style={separatorStyle} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
