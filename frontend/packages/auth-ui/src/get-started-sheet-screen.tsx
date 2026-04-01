import { useCallback } from "react";
import { Sheet, useSheetNavigation, Routes } from "@ion/navigation";
import { translate } from "@ion/localization";
import { GetStartedScreen } from "./get-started-screen";

export function GetStartedSheetScreen() {
  const navigation = useSheetNavigation();

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate(Routes.Sheet.Register);
  }, [navigation]);

  const handleNavigateToVerifyPassword = useCallback(() => {
    navigation.navigate(Routes.Sheet.ProfileSetup);
  }, [navigation]);

  const handleNavigateToRestore = useCallback(() => {
    navigation.navigate(Routes.Sheet.ProfileSetup);
  }, [navigation]);

  return (
    <Sheet onClose={handleClose} title={translate("auth:getStartedTitle")}>
      <GetStartedScreen
        onNavigateToRegister={handleNavigateToRegister}
        onNavigateToVerifyPassword={handleNavigateToVerifyPassword}
        onNavigateToRestore={handleNavigateToRestore}
      />
    </Sheet>
  );
}
