import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Button, Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent, useAppNavigation } from "@ion/navigation";

function InvalidCredentialsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:invalidCredentialsDescription")}
    </Text>
  );
}

function buildButtonContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    paddingTop: scale(12),
  };
}

function CloseButton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const navigation = useAppNavigation();

  const containerStyle = useMemo(() => buildButtonContainerStyle(scale), [scale]);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <View style={containerStyle}>
      <Button label={translate("auth:closeButton")} onPress={handleClose} />
    </View>
  );
}

export function InvalidCredentialsModal() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <DynamicSheet showClose={false}>
      <InformationSheetContent
        icon={<Icon name="keys-error" size={scale(80)} color="white" />}
        title={translate("auth:invalidCredentialsTitle")}
        description={<InvalidCredentialsDescription />}
        topPadding={30}
      />
      <CloseButton />
    </DynamicSheet>
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
