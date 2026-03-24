"use client";

import { createContext, useContext, useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import type { Theme, ColorMode } from "./theme-types";
import { createScaleFunctions } from "../scaling/scale-functions";
import { buildTheme } from "./build-theme";

const ThemeContext = createContext<Theme | null>(null);

const BASE_DESIGN_WIDTH = 375;

interface ThemeProviderProps {
  colorMode?: ColorMode;
  overrides?: Partial<Theme>;
  children: React.ReactNode;
}

export function ThemeProvider(props: ThemeProviderProps) {
  const { width } = useWindowDimensions();
  const colorMode = props.colorMode ?? "light";
  const isWeb = Platform.OS === "web";
  const screenWidth = isWeb ? BASE_DESIGN_WIDTH : (width > 0 ? width : BASE_DESIGN_WIDTH);

  const theme = useMemo(() => {
    const scaleFunctions = createScaleFunctions(screenWidth);
    return buildTheme({
      colorMode,
      scaleFunctions,
      overrides: props.overrides,
    });
  }, [screenWidth, colorMode, props.overrides]);

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return theme;
}
