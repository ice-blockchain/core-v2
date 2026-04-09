import type { ImageSourcePropType } from "react-native";

import portfolioBannerUrl from "./portfolio-banner@3x.png";
import emptyCoinsUrl from "./empty-coins@3x.png";
import swapBannerUrl from "./swap-banner@3x.png";
import bridgeBannerUrl from "./bridge-banner@3x.png";
import emptyNftsUrl from "./empty-nfts@3x.png";
import walletDeleteUrl from "./wallet-delete@3x.png";

export const portfolioBannerImage: ImageSourcePropType = {
  uri: portfolioBannerUrl as string,
};
export const emptyCoinsImage: ImageSourcePropType = {
  uri: emptyCoinsUrl as string,
};
export const swapBannerImage: ImageSourcePropType = {
  uri: swapBannerUrl as string,
};
export const bridgeBannerImage: ImageSourcePropType = {
  uri: bridgeBannerUrl as string,
};
export const emptyNftsImage: ImageSourcePropType = {
  uri: emptyNftsUrl as string,
};
export const walletDeleteImage: ImageSourcePropType = {
  uri: walletDeleteUrl as string,
};
