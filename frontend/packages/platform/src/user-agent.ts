import { getDeviceInfo } from "./device-info";

const APP_NAME = "ion";

let cached: string | null = null;
let pending: Promise<string> | null = null;

async function buildUserAgent(): Promise<string> {
  const info = await getDeviceInfo();
  return `${info.platform}/${info.osVersion} ${APP_NAME}/${info.appVersion}.${info.buildNumber}`;
}

export async function getUserAgent(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;

  pending = buildUserAgent().then((ua) => {
    cached = ua;
    pending = null;
    return ua;
  });

  return pending;
}
