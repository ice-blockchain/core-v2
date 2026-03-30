import * as FileSystem from "expo-file-system";

export async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  return info.exists && info.size ? info.size : 0;
}
