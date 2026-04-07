import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

interface MediaPickerHeaderProps {
  albumTitle: string;
  selectedCount: number;
  onBack: () => void;
  onAlbumPress: () => void;
  onAdd: () => void;
}

function buildHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
  };
}

function buildAlbumTitleRowStyle(): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  };
}

export function MediaPickerHeader({ albumTitle, selectedCount, onBack, onAlbumPress, onAdd }: MediaPickerHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  const hasSelection = selectedCount > 0;
  const addColor = hasSelection ? theme.colors.primaryAccent : theme.colors.sheetLine;
  const addLabel = hasSelection ? `${translate('feed:addButtonLabel')} (${selectedCount})` : '';

  return (
    <View style={headerStyle}>
      <Pressable onPress={onBack} hitSlop={8} style={{ width: scale(80) }}>
        <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
      </Pressable>
      <Pressable onPress={onAlbumPress} style={buildAlbumTitleRowStyle()}>
        <Text variant="subtitle">{albumTitle}</Text>
        <Icon name="chevron-down" size={scale(12)} color={theme.colors.primaryText} />
      </Pressable>
      <Pressable onPress={onAdd} disabled={!hasSelection} style={{ width: scale(80), alignItems: 'flex-end' }}>
        <Text variant="body" color={addColor}>{addLabel}</Text>
      </Pressable>
    </View>
  );
}
