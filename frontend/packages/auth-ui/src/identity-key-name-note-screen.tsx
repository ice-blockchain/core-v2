import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent } from "@ion/navigation";

function SecuredByLine({ color, accentColor }: { color: string; accentColor: string }) {
  return (
    <View style={styles.securedByWrapper}>
      <Text variant="body2" color={color}>
        {translate("auth:identityKeyNameNoteSecuredBy")}
      </Text>
      <View style={styles.securedByBrand}>
        <Icon name="login-identity" size={20} color={accentColor} />
        <Text variant="caption" color={accentColor}>Identity.io</Text>
      </View>
    </View>
  );
}

function IdentityKeyNameNoteDescription() {
  const { colors } = useTheme();

  return (
    <View style={styles.descriptionContainer}>
      <Text variant="body2" color={colors.secondaryText}>
        {translate("auth:identityKeyNameNoteDescription")}
      </Text>
      <SecuredByLine color={colors.secondaryText} accentColor={colors.primaryAccent} />
    </View>
  );
}

export function IdentityKeyNameNoteScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <DynamicSheet title={translate("auth:identityKeyNameNoteModalTitle")}>
      <InformationSheetContent
        icon={<Icon name="identity-key-note" size={scale(80)} />}
        title={translate("auth:identityKeyNameNoteTitle")}
        description={<IdentityKeyNameNoteDescription />}
      />
    </DynamicSheet>
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
  securedByBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
