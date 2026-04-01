import { useCallback } from "react";
import { Sheet, useSheetNavigation, Routes } from "@ion/navigation";
import { translate } from "@ion/localization";
import { RegisterScreen } from "./register-screen";

export function RegisterSheetScreen() {
  const navigation = useSheetNavigation();

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(() => {
    navigation.navigate(Routes.Sheet.ProfileSetup);
  }, [navigation]);

  return (
    <Sheet onClose={handleClose} title={translate("auth:registerTitle")}>
      <RegisterScreen onContinue={handleContinue} />
    </Sheet>
  );
}
