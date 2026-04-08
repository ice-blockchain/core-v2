import { translate } from "@ion/localization";
import { DynamicSheet } from "@ion/navigation";
import { PROFILE_NAMESPACE } from "./translations";
import { SettingsHomeScreen } from "./SettingsHomeScreen";

export function SettingsSheetScreen() {
  return (
    <DynamicSheet title={translate(`${PROFILE_NAMESPACE}:settingsTitle`)}>
      <SettingsHomeScreen />
    </DynamicSheet>
  );
}
