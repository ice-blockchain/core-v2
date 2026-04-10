import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSheetScroll, useAuthNavigation, Routes } from "@ion/navigation";
import { RegisterHeader } from "./register-header";
import { RestoreOptionCard } from "./restore-option-card";
import { AuthFooter } from "./auth-footer";
import { RestoreKeyIcon } from "./restore-key-icon";
import { getCloudProvider } from "./cloud-provider";

function useRestoreStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5) },
    options: {
      ...styles.options,
      marginTop: scale.scaleSize(63),
      gap: scale.scaleSize(16),
      paddingHorizontal: scale.scaleSize(38),
    },
    iconSize: scale.scaleSize(48),
  }), [scale]);
}

function RestoreOptions() {
  const cloudProvider = getCloudProvider();
  const restoreStyles = useRestoreStyles();
  const navigation = useAuthNavigation();

  return (
    <View style={restoreStyles.options}>
      <RestoreOptionCard
        icon={<Icon name="restore-cloud" size={restoreStyles.iconSize} />}
        title={translate("auth:restoreFromCloudTitle", { cloudProvider })}
        description={translate("auth:restoreFromCloudDescription", { cloudProvider })}
        onPress={() => navigation.navigate(Routes.Auth.RestoreFromCloud)}
      />
      <RestoreOptionCard
        icon={<Icon name="restore-credentials" size={restoreStyles.iconSize} />}
        title={translate("auth:restoreUsingCredentialsTitle")}
        description={translate("auth:restoreUsingCredentialsDescription")}
        onPress={() => navigation.navigate(Routes.Auth.RestoreWithRecoveryCreds)}
      />
    </View>
  );
}

function RestoreIdentityContent() {
  const sheetScroll = useSheetScroll();
  const restoreStyles = useRestoreStyles();

  return (
    <BottomSheetScrollView
      onScroll={sheetScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={restoreStyles.page}>
        <RegisterHeader
          icon={<RestoreKeyIcon />}
          title={translate("auth:restoreMenuTitle")}
          subtitle={translate("auth:restoreMenuSubtitle")}
        />
        <RestoreOptions />
        <AuthFooter />
      </View>
    </BottomSheetScrollView>
  );
}

function useContainerStyle() {
  const theme = useTheme();
  return useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );
}

export function RestoreIdentityScreen() {
  const containerStyle = useContainerStyle();

  return (
    <View style={containerStyle}>
      <RestoreIdentityContent />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  options: {
    width: "100%",
  },
});
