import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const chatEmptyStateImage: ImageSourcePropType = resolveAsset(require("../assets/chat-empty-state.png") as number);
/* eslint-enable @typescript-eslint/no-var-requires */
