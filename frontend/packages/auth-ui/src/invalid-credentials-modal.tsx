import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { SingleActionSheetScreen, useAppNavigation } from "@ion/navigation";

function InvalidCredentialsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:invalidCredentialsDescription")}
    </Text>
  );
}

export function InvalidCredentialsModal() {
  const navigation = useAppNavigation();

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <SingleActionSheetScreen
      iconName="keys-error"
      iconColor="white"
      title={translate("auth:invalidCredentialsTitle")}
      description={<InvalidCredentialsDescription />}
      buttonLabel={translate("auth:closeButton")}
      onPress={handleClose}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
