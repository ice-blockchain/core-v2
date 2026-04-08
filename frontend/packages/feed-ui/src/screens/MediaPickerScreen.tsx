import { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Sheet } from '@ion/navigation';
import { translate } from '@ion/localization';
import { Text, useTheme } from '@ion/ui';
import type { DeviceAsset } from '@ion/feed';
import { MediaPickerGrid } from '../components/media-picker/MediaPickerGrid';
import { useMediaPickerScreenState } from './use-media-picker-screen-state';

const noop = () => {};

function AddButton({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  const hasSelection = count > 0;
  const color = hasSelection ? theme.colors.primaryAccent : theme.colors.sheetLine;
  const label = hasSelection ? `${translate('feed:addButtonLabel')} (${count})` : '';
  const width = useMemo(() => ({ width: theme.scale.scaleSize(80), alignItems: 'flex-end' as const }), [theme]);

  return (
    <Pressable onPress={onPress} disabled={!hasSelection} style={width}>
      <Text variant="body" color={color}>{label}</Text>
    </Pressable>
  );
}

export function MediaPickerSheetScreen() {
  const route = useRoute();
  const params = (route.params ?? {}) as { onComplete?: (assets: DeviceAsset[]) => void };
  const onComplete = useCallback((assets: DeviceAsset[]) => {
    (params.onComplete ?? noop)(assets);
  }, [params.onComplete]);

  const state = useMediaPickerScreenState(onComplete);

  return (
    <Sheet onClose={state.handleBack} title={translate('feed:allMediaTitle')} titleVisible onBack={state.handleBack} headerRightAction={<AddButton count={state.selectedCount} onPress={state.handleAdd} />}>
      <MediaPickerGrid assets={state.assets} selectedItems={state.selectedItems} isMaxSelected={state.isMaxSelected} onToggleSelection={state.toggleSelection} onCameraPress={state.handleCameraPress} onEndReached={state.loadMore} />
    </Sheet>
  );
}
