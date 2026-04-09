import { useCallback, useMemo } from "react";
import { Image, StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DoubleActionSheetScreen, useAppNavigation } from "@ion/navigation";

import { cancelPostImage } from "../assets/feed-images";

function CancelPostDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("feed:cancelPostDescription")}
    </Text>
  );
}

function useCancelPostIcon() {
  const { scale } = useTheme();
  const size = scale.scaleSize(80);

  return useMemo(
    () => <Image source={cancelPostImage} style={{ width: size, height: size }} />,
    [size],
  );
}

function useDismissBothSheets() {
  const navigation = useAppNavigation();

  return useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    requestAnimationFrame(() => {
      if (navigation.canGoBack()) navigation.goBack();
    });
  }, [navigation]);
}

export function CancelPostScreen() {
  const navigation = useAppNavigation();
  const { colors } = useTheme();
  const icon = useCancelPostIcon();
  const handleDelete = useDismissBothSheets();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DoubleActionSheetScreen
      icon={icon}
      title={translate("feed:cancelPostTitle")}
      description={<CancelPostDescription />}
      secondaryLabel={translate("feed:cancelPostBackButton")}
      primaryLabel={translate("feed:cancelPostDeleteButton")}
      primaryColor={colors.attentionRed}
      onSecondaryPress={handleBack}
      onPrimaryPress={handleDelete}
      onDismiss={handleBack}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: { textAlign: "center" },
});
