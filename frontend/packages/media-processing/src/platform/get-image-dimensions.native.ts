import * as ImageManipulator from "expo-image-manipulator";

export async function getImageDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(uri, []);
  return { width: result.width, height: result.height };
}
