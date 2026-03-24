import { Platform, NativeModules } from "react-native";
import type { InstallReferrer } from "./types";

let cached: InstallReferrer | null = null;

const EMPTY_REFERRER: InstallReferrer = {
  senderId: null,
  rawReferrer: null,
};

function parseSenderId(referrer: string): string | null {
  const match = referrer.match(/sender_id=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function fetchAndroidReferrer(): Promise<InstallReferrer> {
  const module = NativeModules.InstallReferrerModule;
  if (!module?.getInstallReferrer) return EMPTY_REFERRER;

  const rawReferrer: string = await module.getInstallReferrer();
  if (!rawReferrer) return EMPTY_REFERRER;

  return {
    senderId: parseSenderId(rawReferrer),
    rawReferrer,
  };
}

export async function getInstallReferrer(): Promise<InstallReferrer> {
  if (cached) return cached;

  if (Platform.OS === "android") {
    cached = await fetchAndroidReferrer();
  } else {
    cached = EMPTY_REFERRER;
  }

  return cached;
}
