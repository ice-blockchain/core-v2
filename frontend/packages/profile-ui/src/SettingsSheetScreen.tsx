import type { SettingsScreens } from "@ion/navigation";
import { SettingsSheetNavigator } from "@ion/navigation";
import { SettingsHomeScreen } from "./SettingsHomeScreen";
import { SettingsAccountScreen } from "./SettingsAccountScreen";

const screens: SettingsScreens = {
  Home: SettingsHomeScreen,
  Account: SettingsAccountScreen,
};

export function SettingsSheetScreen() {
  return <SettingsSheetNavigator screens={screens} />;
}
