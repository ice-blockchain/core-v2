import { Image } from "react-native";
import type { MediaViewerSource } from "@ion/media-viewer";

/* eslint-disable @typescript-eslint/no-var-requires */
const resolveAsset = (asset: number): MediaViewerSource => ({
  uri: Image.resolveAssetSource(asset).uri,
  mimeType: "image/png",
});

export const avatarReceivedIon: MediaViewerSource = resolveAsset(require("../assets/avatar-received-ion.png") as number);
export const avatarNewFollower: MediaViewerSource = resolveAsset(require("../assets/avatar-new-follower.png") as number);
export const avatarNewMessage: MediaViewerSource = resolveAsset(require("../assets/avatar-new-message.png") as number);
/* eslint-enable @typescript-eslint/no-var-requires */
