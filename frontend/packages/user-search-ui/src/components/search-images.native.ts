import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const emptySearchImage: ImageSourcePropType = resolveAsset(require("../assets/empty-search.png") as number);
export const searchHintImage: ImageSourcePropType = resolveAsset(require("../assets/search-hint.png") as number);
/* eslint-enable @typescript-eslint/no-var-requires */
