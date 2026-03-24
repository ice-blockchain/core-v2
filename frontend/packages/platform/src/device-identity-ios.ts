import * as Keychain from "react-native-keychain";
import { generateUuid } from "./generate-uuid";

const SERVICE_NAME = "com.ion.device-id";
const ACCOUNT_NAME = "device-id-account";

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
