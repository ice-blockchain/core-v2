import { Platform } from "react-native";
import { getAndroidDeviceId } from "./device-identity-android";
import { getIosDeviceId } from "./device-identity-ios";

let cached: string | null = null;
let pending: Promise<string> | null = null;

function fetchDeviceId(): Promise<string> {
  return Platform.OS === "ios" ? getIosDeviceId() : getAndroidDeviceId();
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;

  pending = fetchDeviceId().then((id) => {
    cached = id;
    pending = null;
    return id;
  });

  return pending;
}
