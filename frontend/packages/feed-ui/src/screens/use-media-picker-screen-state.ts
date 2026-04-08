import { useCallback, useEffect } from 'react';
import { useSheetNavigation } from '@ion/navigation';
import { fetchDevicePhotos, capturePhoto } from '@ion/feed';
import type { DeviceAsset } from '@ion/feed';
import { useSelectionState, useAssetPagination } from '../components/media-picker/use-media-picker-state';

export function useMediaPickerScreenState(onComplete: (assets: DeviceAsset[]) => void) {
  const navigation = useSheetNavigation();
  const selection = useSelectionState();
  const pagination = useAssetPagination(fetchDevicePhotos);

  useEffect(() => { pagination.loadInitial(); }, []);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAdd = useCallback(() => {
    const selected = pagination.assets.filter((a) => selection.selectedItems.has(a.id));
    onComplete(selected);
    navigation.goBack();
  }, [pagination.assets, selection.selectedItems, onComplete, navigation]);

  const handleCameraPress = useCallback(async () => {
    const photo = await capturePhoto();
    if (photo) { onComplete([photo]); navigation.goBack(); }
  }, [onComplete, navigation]);

  return { ...selection, ...pagination, handleBack, handleAdd, handleCameraPress };
}
