import { getDeviceInfo } from "./device-info";

const APP_NAME = "ion";

let cached: string | null = null;

export async function getUserAgent(): Promise<string> {
  if (cached) return cached;

  const info = await getDeviceInfo();
  cached = `${info.platform}/${info.osVersion} ${APP_NAME}/${info.appVersion}.${info.buildNumber}`;
  return cached;
}
