import { Image } from "react-native";
import type { MediaViewerSource } from "@ion/media-viewer";
import { SplashScreen as SplashScreenCore } from "@ion/splash-ui";

const resolvedAsset = Image.resolveAssetSource(
  require("../../assets/videos/logo_static.mp4"),
);

const splashSource: MediaViewerSource = {
  uri: resolvedAsset.uri,
  mimeType: "video/mp4",
};

export function SplashScreen() {
  return <SplashScreenCore videoSource={splashSource} />;
}
