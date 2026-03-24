import type { DeviceInfo } from "./types";

let cached: DeviceInfo | null = null;

function parseUserAgent(): { browser: string; browserVersion: string } {
  const userAgent = navigator.userAgent;
  const match =
    userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+[\d.]*)/) ??
    userAgent.match(/(MSIE |rv:)([\d.]+)/);

  if (match) {
    return { browser: match[1] ?? "Unknown", browserVersion: match[2] ?? "0" };
  }

  return { browser: "Unknown", browserVersion: "0" };
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (cached) return cached;

  const { browser, browserVersion } = parseUserAgent();

  cached = {
    platform: "web",
    osVersion: browserVersion,
    deviceModel: browser,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? "0",
  };

  return cached;
}
