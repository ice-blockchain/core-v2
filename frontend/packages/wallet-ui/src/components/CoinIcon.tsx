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
    if (!isSvg || !uri) { setXml(null); return; }
    const currentCached = svgCache.get(uri);
    if (currentCached) { setXml(currentCached); return; }
    if (failedUrls.has(uri)) { setXml(null); return; }
    setXml(null);
    let cancelled = false;
    fetch(uri)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        svgCache.set(uri, text);
        if (!cancelled) setXml(text);
      })
      .catch(() => {
        failedUrls.add(uri);
        if (!cancelled) setXml(null);
      });
    return () => { cancelled = true; };
  }, [uri, isSvg]);

  return isSvg ? xml : null;
}

function useCoinIconStyles() {
  const theme = useTheme();
  const size = theme.scale.scaleSize(36);
  const borderRadius = theme.scale.scaleRadius(10);
  return useMemo(() => ({
    container: { width: size, height: size, borderRadius, overflow: "hidden" as const, backgroundColor: theme.colors.tertiaryBackground },
    fallbackBg: { backgroundColor: theme.colors.sheetLine },
    iconSize: theme.scale.scaleSize(24),
    iconColor: theme.colors.onPrimaryAccent,
    size,
  }), [size, borderRadius, theme.colors.tertiaryBackground, theme.colors.sheetLine, theme.colors.onPrimaryAccent, theme.scale]);
}

function CoinIconComponent({ uri }: CoinIconProps) {
  const s = useCoinIconStyles();
  const [hasError, setHasError] = useState(false);
  const svgXml = useSvgXml(uri);
  const handleError = useCallback(() => setHasError(true), []);

  useEffect(() => { setHasError(false); }, [uri]);

  if (!uri || hasError || failedUrls.has(uri)) {
    return (
      <View style={[s.container, s.fallbackBg, fallbackStyles.background]}>
        <Icon name="coin-fallback" size={s.iconSize} color={s.iconColor} />
      </View>
    );
  }

  if (isSvgUrl(uri)) {
    if (!svgXml) return <View style={s.container} />;
    return <View style={s.container}><SvgXml xml={svgXml} width={s.size} height={s.size} /></View>;
  }

  return <Image source={{ uri }} style={s.container} onError={handleError} />;
}

const fallbackStyles = StyleSheet.create({
  background: { alignItems: "center", justifyContent: "center" },
});

export const CoinIcon = memo(CoinIconComponent);
