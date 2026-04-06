import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button, useTheme } from "@ion/ui";
import { useSheetScroll } from "@ion/navigation";
import { translate } from "@ion/localization";
import type { RegisterScreenCallbacks } from "./password-register-screen";
import { RegisterHeader } from "./register-header";
import { RegisterPasskeyIcon } from "./register-passkey-icon";
import { PasskeyBenefitList } from "./passkey-benefit-list";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { ArrowIcon } from "./arrow-icon";

export interface PasskeyRegisterScreenProps {
  callbacks?: RegisterScreenCallbacks;
}

function useScaledStyles() {
  const theme = useTheme();
  const { scaleSize } = theme.scale;
  const container = useMemo(() => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]);
  const page = useMemo(() => ({ ...styles.page, paddingHorizontal: scaleSize(44) }), [scaleSize]);
  const input = useMemo(() => ({ marginTop: scaleSize(44), alignSelf: "stretch" as const }), [scaleSize]);
  const continueBtn = useMemo(() => ({ marginTop: scaleSize(20), alignSelf: "stretch" as const }), [scaleSize]);
  return { container, page, input, continueBtn, arrowColor: theme.colors.onPrimaryAccent };
}

export function PasskeyRegisterScreen({ callbacks }: PasskeyRegisterScreenProps) {
  const identity = useIdentityKeyValidation();
  const scaled = useScaledStyles();

  const handleContinue = useCallback(() => {
    if (!identity.validate()) return;
    callbacks?.onContinue({ identityKeyName: identity.value });
  }, [identity, callbacks]);

  const sheetScroll = useSheetScroll();

  return (
    <View style={scaled.container}>
      <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} contentContainerStyle={scaled.page} keyboardShouldPersistTaps="handled">
        <RegisterHeader icon={<RegisterPasskeyIcon />} title={translate("auth:passkeyRegisterTitle")} />
        <PasskeyBenefitList />
        <View style={scaled.input}>
          <IdentityKeyNameInput identity={identity} />
        </View>
        <View style={scaled.continueBtn}>
          <Button label={translate("auth:continueButton")} icon={<ArrowIcon size={15} color={scaled.arrowColor} />} iconPosition="right" onPress={handleContinue} />
        </View>
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
  },
});
