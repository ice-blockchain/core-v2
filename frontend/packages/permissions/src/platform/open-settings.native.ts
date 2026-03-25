import { openSettings as nativeOpenSettings } from "react-native-permissions";

export async function openSettings(): Promise<void> {
  await nativeOpenSettings();
}
