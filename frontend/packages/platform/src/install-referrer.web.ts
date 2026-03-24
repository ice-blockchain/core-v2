import type { InstallReferrer } from "./types";

let cached: InstallReferrer | null = null;

function parseReferrerFromUrl(): InstallReferrer {
  const params = new URLSearchParams(window.location.search);

  const senderId = params.get("ref") ?? params.get("utm_source") ?? null;
  const rawReferrer = params.toString() || null;

  return { senderId, rawReferrer };
}

export async function getInstallReferrer(): Promise<InstallReferrer> {
  if (cached) return cached;
  cached = parseReferrerFromUrl();
  return cached;
}
