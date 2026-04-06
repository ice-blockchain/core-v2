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

function GetStartedHeader() {
  const { colors } = useTheme();

  const iconCircleStyle = useMemo(() => ({
    ...styles.iconCircle,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);

  return (
    <>
      <View style={iconCircleStyle}>
        <IceLogoIcon />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={styles.subtitle}>
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

function GetStartedActions({ identity, onContinue, onRegister, onRestore }: GetStartedActionsProps) {
  const { colors } = useTheme();
  const handleContinue = useCallback(() => {
    if (identity.validate()) { onContinue(); }
  }, [identity, onContinue]);

  return (
    <>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={styles.orText}>{translate("auth:orDivider")}</Text>
      <SecondaryButton label={translate("auth:registerButton")} onPress={onRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton label={translate("auth:restoreIdentityKeyButton")} leftIcon={<Icon name="restore-key" size={24} />} onPress={onRestore} />
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

export function GetStartedScreen({ callbacks }: GetStartedScreenProps) {
  const identity = useIdentityKeyValidation(callbacks?.initialIdentityKeyName);
  const handlers = useGetStartedHandlers(callbacks, identity);
  const containerStyle = useContainerStyle();
  const sheetScroll = useSheetScroll();

  return (
    <View style={containerStyle}>
      <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <GetStartedHeader />
        <IdentityKeyNameInput identity={identity} style={styles.field} />
        <GetStartedActions
          identity={identity}
          onContinue={handlers.handleContinue}
          onRegister={handlers.handleRegister}
          onRestore={handlers.handleRestore}
        />
        <View style={styles.footer}>
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
    paddingTop: 50,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 40,
  },
  field: {
    width: 287,
  },
  continueWrapper: {
    marginTop: 16,
  },
  orText: {
    marginVertical: 16,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
