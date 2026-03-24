import { Platform } from "react-native";
import { getAndroidDeviceId } from "./device-identity-android";
import { getIosDeviceId } from "./device-identity-ios";

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  cached =
    Platform.OS === "ios"
      ? await getIosDeviceId()
      : await getAndroidDeviceId();

  return cached;
}
