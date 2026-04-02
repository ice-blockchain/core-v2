import { useMemo } from "react";
import { Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
interface SheetScreenHeaderProps {
  canGoBack?: boolean;
  title?: string | undefined;
  titleOpacity?: number | undefined;
  onBack?: (() => void) | undefined;
}

function buildHeaderStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    backgroundColor,
  };
}

export function SheetScreenHeader({ canGoBack = true, title, titleOpacity = 0, onBack }: SheetScreenHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: scale(24) }), [scale]);

  return (
    <View style={headerStyle}>
      {canGoBack ? (
        <Pressable onPress={onBack} hitSlop={8} testID="sheet-back-button" accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
        </Pressable>
      ) : (
        <View style={spacerStyle} />
      )}
      {title ? (
        <Text variant="subtitle" style={{ opacity: titleOpacity }}>
          {title}
        </Text>
      ) : (
        <View />
      )}
      <View style={{ ...spacerStyle, opacity: 0 }}>
        <Icon name="close" size={scale(24)} color={theme.colors.primaryText} />
      </View>
    </View>
  );
}
