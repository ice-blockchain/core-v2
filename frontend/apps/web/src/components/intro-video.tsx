"use client";

import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { MediaVideo } from "@ion/media-viewer";
import type { MediaViewerSource } from "@ion/media-viewer";

interface IntroVideoProps {
  children: ReactNode;
}

const introSource: MediaViewerSource = {
  uri: "/videos/intro.mp4",
  mimeType: "video/mp4",
};

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#000000",
};

const videoStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%" as const,
  height: "100%" as const,
};

const overlayStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  width: "100%",
  height: "100%",
  paddingBottom: 76,
};

export function IntroVideo({ children }: IntroVideoProps) {
  return (
    <div style={containerStyle}>
      <MediaVideo
        source={introSource}
        autoPlay
        muted
        isLooping
        resizeMode="cover"
        style={videoStyle}
      />
      <div style={overlayStyle}>{children}</div>
    </div>
  );
}
