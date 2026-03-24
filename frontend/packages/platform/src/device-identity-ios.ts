import * as Keychain from "react-native-keychain";
import { generateUuid } from "./generate-uuid";

const SERVICE_NAME = "com.ion.device-id";
const ACCOUNT_NAME = "device-id-account";

/**
 * Reads or creates a persistent device ID in the iOS Keychain.
 *
 * Known limitation: cross-process races (e.g. app + notification service
 * extension reading simultaneously) can produce different IDs. The Keychain
 * API has no compare-and-swap. In-process callers are protected by the
 * pending-promise dedup in device-identity.ts. Notification extensions
 * should read from the app group, not call this directly.
 */
export async function getIosDeviceId(): Promise<string> {
  const credentials = await Keychain.getGenericPassword({
    service: SERVICE_NAME,
  });

  if (credentials && credentials.password) {
    return credentials.password;
  }

  const generated = generateUuid();

  await Keychain.setGenericPassword(ACCOUNT_NAME, generated, {
    service: SERVICE_NAME,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });

  return generated;
}
