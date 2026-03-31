import type { CSSProperties } from "react";
import { MediaVideo } from "@ion/media-viewer";
import type { MediaViewerSource } from "@ion/media-viewer";
import { SPLASH_BACKGROUND_COLOR } from "@ion/splash";

interface SplashVideoProps {
  source: MediaViewerSource;
  onEnd: () => void;
  onError: () => void;
}

export function SplashVideo({ source, onEnd, onError }: SplashVideoProps) {
  return (
    <div style={containerStyle}>
      <MediaVideo
        source={source}
        autoPlay
        muted
        resizeMode="contain"
        onEnd={onEnd}
        onError={onError}
        style={videoStyle}
      />
    </div>
  );
}

const containerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: SPLASH_BACKGROUND_COLOR,
  width: "100%",
  height: "100%",
};

const videoStyle = {
  maxWidth: "100%" as const,
  maxHeight: "100%" as const,
};
