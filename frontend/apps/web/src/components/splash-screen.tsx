import type { MediaViewerSource } from "@ion/media-viewer";
import { SplashScreen as SplashScreenCore } from "@ion/splash-ui";

const splashSource: MediaViewerSource = {
  uri: "/videos/logo_static.mp4",
  mimeType: "video/mp4",
};

export function SplashScreen() {
  return <SplashScreenCore videoSource={splashSource} onComplete={() => {}} />;
}
