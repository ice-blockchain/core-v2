import DeviceInfo from "react-native-device-info";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateUuid } from "./generate-uuid";

const STORAGE_KEY = "@ion/platform/device-id";

async function readOrCreateFallbackId(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const generated = generateUuid();
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

export async function getAndroidDeviceId(): Promise<string> {
  try {
    const androidId = await DeviceInfo.getAndroidId();
    if (androidId && androidId !== "unknown") return androidId;
  } catch {
    // Android ID unavailable on some OEM ROMs — fall through to UUID
  }

  return readOrCreateFallbackId();
}
