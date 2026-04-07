import { Permissions } from "@ion/permissions";

export async function openDeviceSettings(): Promise<void> {
  await Permissions.openSettings();
}
