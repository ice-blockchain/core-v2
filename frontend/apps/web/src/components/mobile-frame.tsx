"use client";

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useWindowSize } from "./use-window-size";

interface MobileFrameProps {
  children: ReactNode;
}

const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 852;
const ASPECT_RATIO = FRAME_WIDTH / FRAME_HEIGHT;
const BEZEL_RADIUS = 50;
const BEZEL_PADDING = 12;
const NOTCH_WIDTH = 126;
const NOTCH_HEIGHT = 34;
const VIEWPORT_PADDING = 32;

const wrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#f0f0f0",
};

function computeScale(vw: number, vh: number) {
  const maxW = vw - VIEWPORT_PADDING * 2;
  const maxH = vh - VIEWPORT_PADDING * 2;
  const bezelW = Math.min(maxW, maxH * ASPECT_RATIO);
  return bezelW / (FRAME_WIDTH + BEZEL_PADDING * 2);
}

function buildBezelStyle(scale: number): CSSProperties {
  const totalW = (FRAME_WIDTH + BEZEL_PADDING * 2) * scale;
  return {
    position: "relative",
    width: totalW,
    height: totalW / ASPECT_RATIO,
    borderRadius: BEZEL_RADIUS * scale,
    backgroundColor: "#1a1a1a",
    padding: BEZEL_PADDING * scale,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset",
    flexShrink: 0,
  };
}

function buildScreenStyle(scale: number): CSSProperties {
  return {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: (BEZEL_RADIUS - BEZEL_PADDING) * scale,
    overflow: "hidden",
    backgroundColor: "#000000",
  };
}

function buildNotchStyle(scale: number): CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: NOTCH_WIDTH * scale,
    height: NOTCH_HEIGHT * scale,
    backgroundColor: "#1a1a1a",
    borderBottomLeftRadius: 20 * scale,
    borderBottomRightRadius: 20 * scale,
    zIndex: 10,
  };
}

const contentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
};

export function MobileFrame({ children }: MobileFrameProps) {
  const { width: vw, height: vh } = useWindowSize();

  const { bezel, screen, notch } = useMemo(() => {
    const s = computeScale(vw, vh);
    return { bezel: buildBezelStyle(s), screen: buildScreenStyle(s), notch: buildNotchStyle(s) };
  }, [vw, vh]);

  return (
    <div style={wrapperStyle}>
      <div style={bezel}>
        <div style={screen}>
          <div style={notch} />
          <div style={contentStyle}>{children}</div>
        </div>
      </div>
    </div>
  );
}
