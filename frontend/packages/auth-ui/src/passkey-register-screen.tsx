import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSheetScroll } from "@ion/navigation";
import type { RegisterScreenCallbacks } from "./password-register-screen";
import { RegisterHeader } from "./register-header";
import { RegisterPasskeyIcon } from "./register-passkey-icon";
import { PasskeyBenefitList } from "./passkey-benefit-list";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { ArrowIcon } from "./arrow-icon";

function PasskeyRegisterContent({ identity, onContinue }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onContinue: () => void;
}) {
  const sheetScroll = useSheetScroll();
  const theme = useTheme();
  const { scaleSize } = theme.scale;
  const pageStyle = useMemo(() => ({ ...styles.page, paddingHorizontal: scaleSize(44) }), [scaleSize]);
  const inputStyle = useMemo(() => ({ marginTop: scaleSize(44), alignSelf: "stretch" as const }), [scaleSize]);
  const continueStyle = useMemo(() => ({ marginTop: scaleSize(20), alignSelf: "stretch" as const }), [scaleSize]);
  const arrowIcon = <ArrowIcon size={15} color={theme.colors.onPrimaryAccent} />;

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <View style={pageStyle}>
        <RegisterHeader icon={<RegisterPasskeyIcon />} title={translate("auth:passkeyRegisterTitle")} />
        <PasskeyBenefitList />
        <View style={inputStyle}>
          <IdentityKeyNameInput identity={identity} />
        </View>
        <View style={continueStyle}>
          <Button label={translate("auth:continueButton")} icon={arrowIcon} iconPosition="right" onPress={onContinue} />
        </View>
      </View>
    </BottomSheetScrollView>
  );
}

export interface PasskeyRegisterScreenProps {
  callbacks?: RegisterScreenCallbacks;
}

export function PasskeyRegisterScreen({ callbacks }: PasskeyRegisterScreenProps) {
  const identity = useIdentityKeyValidation();
  const theme = useTheme();

  const containerStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );

  const handleContinue = useCallback(() => {
    if (identity.validate()) {
      callbacks?.onContinue({ identityKeyName: identity.value });
    }
  }, [identity, callbacks]);

  return (
    <View style={containerStyle}>
      <PasskeyRegisterContent identity={identity} onContinue={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
  },
});
