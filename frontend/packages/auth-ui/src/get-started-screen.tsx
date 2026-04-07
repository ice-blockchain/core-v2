import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, Text, useTheme } from "@ion/ui";
import { useSheetScroll } from "@ion/navigation";
import { translate } from "@ion/localization";
import { PrimaryButton } from "./primary-button";
import { SecondaryButton } from "./secondary-button";
import { TextButton } from "./text-button";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { IceLogoIcon } from "./ice-logo-icon";
import { CreateAccountIcon } from "./create-account-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";

function useScaledHeaderStyles() {
  const { colors, scale } = useTheme();
  return useMemo(() => ({
    iconCircle: {
      width: scale.scaleSize(65),
      height: scale.scaleSize(65),
      borderRadius: scale.scaleRadius(32.5),
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: scale.scaleSize(20),
      backgroundColor: colors.primaryAccent,
    },
    subtitle: {
      textAlign: "center" as const,
      maxWidth: scale.scaleSize(320),
      marginBottom: scale.scaleSize(40),
    },
  }), [colors.primaryAccent, scale]);
}

function GetStartedHeader() {
  const { colors } = useTheme();
  const scaled = useScaledHeaderStyles();

  return (
    <>
      <View style={scaled.iconCircle}>
        <IceLogoIcon />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={scaled.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
    </>
  );
}

interface GetStartedActionsProps {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onContinue: () => void;
  onRegister: () => void;
  onRestore: () => void;
}

function useScaledActionStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    continueWrapper: { marginTop: scale.scaleSize(16) },
    orText: { marginVertical: scale.scaleSize(16) },
    iconSize: scale.scaleSize(24),
  }), [scale]);
}

function GetStartedActions({ identity, onContinue, onRegister, onRestore }: GetStartedActionsProps) {
  const { colors } = useTheme();
  const scaled = useScaledActionStyles();
  const handleContinue = useCallback(() => {
    if (identity.validate()) { onContinue(); }
  }, [identity, onContinue]);

  return (
    <>
      <View style={scaled.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={scaled.orText}>{translate("auth:orDivider")}</Text>
      <SecondaryButton label={translate("auth:registerButton")} onPress={onRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton label={translate("auth:restoreIdentityKeyButton")} leftIcon={<Icon name="restore-key" size={scaled.iconSize} />} onPress={onRestore} />
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

function useGetStartedHandlers(callbacks: GetStartedScreenCallbacks | undefined, identity: ReturnType<typeof useIdentityKeyValidation>) {
  const handleContinue = useCallback(() => {
    callbacks?.onNavigateToVerifyPassword(identity.value);
  }, [callbacks, identity.value]);

  const handleRegister = useCallback(() => {
    callbacks?.onNavigateToRegister();
  }, [callbacks]);

  const handleRestore = useCallback(() => {
    callbacks?.onNavigateToRestore();
  }, [callbacks]);

  return { handleContinue, handleRegister, handleRestore };
}

function useContainerStyle() {
  const { colors } = useTheme();
  return useMemo(() => ({ flex: 1 as const, backgroundColor: colors.secondaryBackground }), [colors]);
}

function useScaledLayoutStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(50) },
    field: { width: scale.scaleSize(287) },
    footer: { ...styles.footer, gap: scale.scaleSize(12), paddingBottom: scale.scaleSize(40) },
  }), [scale]);
}

export function GetStartedScreen({ callbacks }: GetStartedScreenProps) {
  const identity = useIdentityKeyValidation(callbacks?.initialIdentityKeyName);
  const handlers = useGetStartedHandlers(callbacks, identity);
  const containerStyle = useContainerStyle();
  const scaled = useScaledLayoutStyles();
  const sheetScroll = useSheetScroll();

  return (
    <View style={containerStyle}>
      <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} contentContainerStyle={scaled.page} keyboardShouldPersistTaps="handled">
        <GetStartedHeader />
        <IdentityKeyNameInput identity={identity} style={scaled.field} />
        <GetStartedActions
          identity={identity}
          onContinue={handlers.handleContinue}
          onRegister={handlers.handleRegister}
          onRestore={handlers.handleRestore}
        />
        <View style={scaled.footer}>
          <SecuredByFooter />
          <TermsFooter />
        </View>
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
  },
});
