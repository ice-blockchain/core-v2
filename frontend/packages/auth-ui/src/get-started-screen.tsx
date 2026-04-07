import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSheetScroll } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { SecondaryButton } from "./secondary-button";
import { TextButton } from "./text-button";
import { AuthFooter } from "./auth-footer";
import { IceLogoIcon } from "./ice-logo-icon";
import { CreateAccountIcon } from "./create-account-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";

function useHeaderStyles() {
  const { colors, scale } = useTheme();

  return useMemo(() => ({
    iconCircle: {
      ...styles.iconCircle,
      width: scale.scaleSize(65),
      height: scale.scaleSize(65),
      borderRadius: scale.scaleRadius(32.5),
      marginBottom: scale.scaleSize(20),
      backgroundColor: colors.primaryAccent,
    },
    subtitle: {
      ...styles.subtitle,
      maxWidth: scale.scaleSize(320),
      marginTop: scale.scaleSize(8),
      marginBottom: scale.scaleSize(56),
    },
    logoWidth: scale.scaleSize(44),
    logoHeight: scale.scaleSize(45),
  }), [colors.primaryAccent, scale]);
}

function GetStartedHeader() {
  const { colors } = useTheme();
  const headerStyles = useHeaderStyles();

  return (
    <>
      <View style={headerStyles.iconCircle}>
        <IceLogoIcon width={headerStyles.logoWidth} height={headerStyles.logoHeight} />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={headerStyles.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
    </>
  );
}

export interface GetStartedScreenCallbacks {
  initialIdentityKeyName: string;
  onNavigateToRegister: () => void;
  onNavigateToVerifyPassword: (identityKeyName: string) => void;
  onNavigateToRestore: () => void;
}

export interface GetStartedScreenProps {
  callbacks?: GetStartedScreenCallbacks;
}

function useActionStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    continueWrapper: { marginTop: scale.scaleSize(16) },
    orText: { marginVertical: scale.scaleSize(14) },
    restoreWrapper: { marginTop: scale.scaleSize(16) },
    iconSize: scale.scaleSize(24),
  }), [scale]);
}

function GetStartedActions({ identity, callbacks }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  callbacks: GetStartedScreenCallbacks | undefined;
}) {
  const { colors } = useTheme();
  const actionStyles = useActionStyles();

  const handleContinue = useCallback(() => {
    if (identity.validate()) {
      callbacks?.onNavigateToVerifyPassword(identity.value);
    }
  }, [identity, callbacks]);

  const handleRegister = useCallback(() => {
    callbacks?.onNavigateToRegister();
  }, [callbacks]);

  const handleRestore = useCallback(() => {
    callbacks?.onNavigateToRestore();
  }, [callbacks]);

  return (
    <>
      <View style={actionStyles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={actionStyles.orText}>
        {translate("auth:orDivider")}
      </Text>
      <SecondaryButton
        label={translate("auth:registerButton")} onPress={handleRegister}
        leftIcon={<CreateAccountIcon color={colors.secondaryText} size={actionStyles.iconSize} />}
      />
      <View style={actionStyles.restoreWrapper}>
        <TextButton
          label={translate("auth:restoreIdentityKeyButton")} onPress={handleRestore}
          leftIcon={<Icon name="restore-key" size={actionStyles.iconSize} color={colors.secondaryText} />}
        />
      </View>
    </>
  );
}

function useContentStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5) },
    field: { width: scale.scaleSize(287) },
  }), [scale]);
}

function GetStartedContent({ identity, callbacks }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  callbacks: GetStartedScreenCallbacks | undefined;
}) {
  const sheetScroll = useSheetScroll();
  const contentStyles = useContentStyles();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={contentStyles.page}>
        <GetStartedHeader />
        <IdentityKeyNameInput identity={identity} style={contentStyles.field} />
        <GetStartedActions identity={identity} callbacks={callbacks} />
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

export function GetStartedScreen({ callbacks }: GetStartedScreenProps) {
  const identity = useIdentityKeyValidation(callbacks?.initialIdentityKeyName);
  const containerStyle = useContainerStyle();

  return (
    <View style={containerStyle}>
      <GetStartedContent identity={identity} callbacks={callbacks} />
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
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    textAlign: "center",
  },
});
