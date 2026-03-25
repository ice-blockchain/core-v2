import { Platform, NativeModules } from "react-native";
import type { InstallReferrer } from "./types";

let cached: InstallReferrer | null = null;
let pending: Promise<InstallReferrer> | null = null;

const EMPTY_REFERRER: InstallReferrer = {
  senderId: null,
  rawReferrer: null,
};

function parseSenderId(referrer: string): string | null {
  const match = referrer.match(/sender_id=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function fetchAndroidReferrer(): Promise<InstallReferrer> {
  try {
    const nativeModule = NativeModules.InstallReferrerModule;
    if (!nativeModule?.getInstallReferrer) return EMPTY_REFERRER;

    const rawReferrer: string = await nativeModule.getInstallReferrer();
    if (!rawReferrer) return EMPTY_REFERRER;

    return {
      senderId: parseSenderId(rawReferrer),
      rawReferrer,
    };
  } catch {
    return EMPTY_REFERRER;
  }
}

async function fetchInstallReferrer(): Promise<InstallReferrer> {
  if (Platform.OS === "android") return fetchAndroidReferrer();
  return EMPTY_REFERRER;
}

export async function getInstallReferrer(): Promise<InstallReferrer> {
  if (cached) return cached;
  if (pending) return pending;

  pending = fetchInstallReferrer().then((referrer) => {
    cached = referrer;
    pending = null;
    return referrer;
  });

  return pending;
}
