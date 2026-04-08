import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const profileEmptyPostsImage: ImageSourcePropType = resolveAsset(require("./assets/profile-empty-posts.png") as number);
export const profileEmptyRepliesImage: ImageSourcePropType = resolveAsset(require("./assets/profile-empty-replies.png") as number);
export const profileEmptyVideoImage: ImageSourcePropType = resolveAsset(require("./assets/profile-empty-video.png") as number);
export const profileEmptyArticlesImage: ImageSourcePropType = resolveAsset(require("./assets/profile-empty-articles.png") as number);
/* eslint-enable @typescript-eslint/no-var-requires */
