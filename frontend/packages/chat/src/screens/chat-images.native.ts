import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const chatEmptyStateImage: ImageSourcePropType = resolveAsset(require("../assets/chat-empty-state.png") as number);
export const chatEmptyStateDarkImage: ImageSourcePropType = resolveAsset(require("../assets/chat-empty-state-dark.png") as number);
export const newChatEmptyStateImage: ImageSourcePropType = resolveAsset(require("../assets/new-chat-empty-state.png") as number);
export const newChatEmptyStateDarkImage: ImageSourcePropType = resolveAsset(require("../assets/new-chat-empty-state-dark.png") as number);
export const chatDeleteImage: ImageSourcePropType = resolveAsset(require("../assets/chat-delete.png") as number);
/* eslint-enable @typescript-eslint/no-var-requires */
