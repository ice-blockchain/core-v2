export async function openDeviceSettings(): Promise<void> {
  const { Permissions } = await import("@ion/permissions");
  await Permissions.openSettings();
}
