import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const portfolioBannerImage: ImageSourcePropType = resolveAsset(
  require("./portfolio-banner.png") as number,
);
export const emptyCoinsImage: ImageSourcePropType = resolveAsset(
  require("./empty-coins.png") as number,
);

export const swapBannerImage: ImageSourcePropType = resolveAsset(
  require("./swap-banner.png") as number,
);
export const bridgeBannerImage: ImageSourcePropType = resolveAsset(
  require("./bridge-banner.png") as number,
);
export const emptyNftsImage: ImageSourcePropType = resolveAsset(
  require("./empty-nfts.png") as number,
);
export const walletDeleteImage: ImageSourcePropType = resolveAsset(
  require("./wallet-delete.png") as number,
);
/* eslint-enable @typescript-eslint/no-var-requires */
