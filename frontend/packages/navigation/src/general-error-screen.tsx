import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { SingleActionSheetScreen } from "./single-action-sheet-screen";
import { useAppNavigation } from "./use-app-navigation";
import type { RootStackParamList } from "./route-params";
import { Routes } from "./routes";

type GeneralErrorRoute = RouteProp<RootStackParamList, 'Sheet/GeneralError'>;

function GeneralErrorDescription({ errorCode }: { errorCode: string }) {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("navigation:generalErrorDescription", { errorCode })}
    </Text>
  );
}

export function GeneralErrorScreen() {
  const route = useRoute<GeneralErrorRoute>();
  const { errorCode } = route.params;
  const navigation = useAppNavigation();

  const handlePress = useCallback(() => {
    // if (navigation.canGoBack()) navigation.goBack();
    // TODO: tmp solution while integration not complete
    navigation.reset({ index: 0, routes: [{ name: Routes.Main }] });
  }, [navigation]);

  return (
    <SingleActionSheetScreen
      iconName="keys-error"
      iconColor="white"
      title={translate("navigation:generalErrorTitle")}
      description={<GeneralErrorDescription errorCode={errorCode} />}
      buttonLabel={translate("navigation:generalErrorButton")}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
