import { Platform } from "react-native";

export function getCloudProvider(): string {
  return Platform.OS === "ios" ? "iCloud" : "Google Drive";
}
