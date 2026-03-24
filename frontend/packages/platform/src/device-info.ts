import DeviceInfoModule from "react-native-device-info";
import { Platform } from "react-native";
import type { DeviceInfo } from "./types";

let cached: DeviceInfo | null = null;

function resolvePlatform(): DeviceInfo["platform"] {
  return Platform.OS === "ios" ? "ios" : "android";
}

async function fetchDeviceInfo(): Promise<DeviceInfo> {
  const [osVersion, deviceModel, appVersion, buildNumber] = await Promise.all([
    DeviceInfoModule.getSystemVersion(),
    DeviceInfoModule.getModel(),
    DeviceInfoModule.getVersion(),
    DeviceInfoModule.getBuildNumber(),
  ]);

  return {
    platform: resolvePlatform(),
    osVersion,
    deviceModel,
    appVersion,
    buildNumber,
  };
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (cached) return cached;
  cached = await fetchDeviceInfo();
  return cached;
}
