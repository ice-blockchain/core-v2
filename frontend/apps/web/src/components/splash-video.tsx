"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface SplashVideoProps {
  onComplete: () => void;
}

const SAFETY_TIMEOUT_MS = 2000;

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100vh",
  backgroundColor: "#FFFFFF",
};

const videoStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

export function SplashVideo({ onComplete }: SplashVideoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onComplete, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    onComplete();
  }, [onComplete]);

  if (hasError) return <div style={containerStyle} />;

  return (
    <div style={containerStyle}>
      <video
        src="/videos/logo_static.mp4"
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        onError={handleError}
        style={videoStyle}
      />
    </div>
  );
}
