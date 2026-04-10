import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Icon, useTheme } from "@ion/ui";

interface CoinIconProps {
  readonly uri: string | null;
}

const svgCache = new Map<string, string>();
const failedUrls = new Set<string>();

function isSvgUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".svg");
}

function useSvgXml(uri: string | null) {
  const isSvg = uri !== null && isSvgUrl(uri);
  const cached = isSvg ? svgCache.get(uri) : undefined;
  const [xml, setXml] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (!isSvg || svgCache.has(uri) || failedUrls.has(uri)) return;
    let cancelled = false;
    fetch(uri)
      .then((res) => res.text())
      .then((text) => {
        svgCache.set(uri, text);
        if (!cancelled) setXml(text);
      })
      .catch(() => {
        failedUrls.add(uri);
      });
    return () => { cancelled = true; };
  }, [uri, isSvg]);

  return isSvg ? xml : null;
}

function CoinIconComponent({ uri }: CoinIconProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const radius = theme.scale.scaleRadius;
  const [hasError, setHasError] = useState(false);
  const svgXml = useSvgXml(uri);

  const size = scale(36);
  const borderRadius = radius(10);

  const containerStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius,
    overflow: "hidden" as const,
    backgroundColor: theme.colors.tertiaryBackground,
  }), [size, borderRadius, theme.colors.tertiaryBackground]);

  const handleError = useCallback(() => setHasError(true), []);

  const fallbackBg = useMemo(() => ({
    backgroundColor: theme.colors.sheetLine,
  }), [theme.colors.sheetLine]);

  if (!uri || hasError || failedUrls.has(uri)) {
    return (
      <View style={[containerStyle, fallbackBg, fallbackStyles.background]}>
        <Icon name="coin-fallback" size={scale(24)} color={theme.colors.onPrimaryAccent} />
      </View>
    );
  }

  if (isSvgUrl(uri)) {
    if (!svgXml) return <View style={containerStyle} />;
    return (
      <View style={containerStyle}>
        <SvgXml xml={svgXml} width={size} height={size} />
      </View>
    );
  }

  return (
    <Image source={{ uri }} style={containerStyle} onError={handleError} />
  );
}

const fallbackStyles = StyleSheet.create({
  background: { alignItems: "center", justifyContent: "center" },
});

export const CoinIcon = memo(CoinIconComponent);
