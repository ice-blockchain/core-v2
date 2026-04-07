import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { InfoSheetScreen } from "@ion/navigation";
import { IdentityBrand } from "./identity-brand";

function IdentityKeyNameNoteDescription() {
  const { colors } = useTheme();

  return (
    <View style={styles.descriptionContainer}>
      <Text variant="body2" color={colors.secondaryText}>
        {translate("auth:identityKeyNameNoteDescription")}
      </Text>
      <View style={styles.securedByWrapper}>
        <Text variant="body2" color={colors.secondaryText}>
          {translate("auth:identityKeyNameNoteSecuredBy")}
        </Text>
        <IdentityBrand />
      </View>
    </View>
  );
}

export function IdentityKeyNameNoteScreen() {
  return (
    <InfoSheetScreen
      headerTitle={translate("auth:identityKeyNameNoteModalTitle")}
      iconName="identity-key-note"
      title={translate("auth:identityKeyNameNoteTitle")}
      description={<IdentityKeyNameNoteDescription />}
    />
  );
}

const styles = StyleSheet.create({
  descriptionContainer: {
    gap: 16,
  },
  securedByWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
});
