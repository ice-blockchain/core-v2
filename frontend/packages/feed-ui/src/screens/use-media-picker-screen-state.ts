import { useCallback, useEffect } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import { fetchDevicePhotos, capturePhoto, requestCameraPermission } from '@ion/feed';
import type { DeviceAsset } from '@ion/feed';
import { useSelectionState } from '../components/media-picker/use-selection-state';
import { useAssetPagination } from '../components/media-picker/use-asset-pagination';

export function useMediaPickerScreenState(onComplete: (assets: DeviceAsset[]) => void) {
  const navigation = useSheetNavigation();
  const selection = useSelectionState();
  const pagination = useAssetPagination(fetchDevicePhotos);
  const { loadInitial } = pagination;

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAdd = useCallback(() => {
    const selected = pagination.assets.filter((a) => selection.selectedItems.has(a.id));
    onComplete(selected);
    navigation.goBack();
  }, [pagination.assets, selection.selectedItems, onComplete, navigation]);

  const handleCameraPress = useCallback(async () => {
    const permission = await requestCameraPermission();
    if (permission === 'permanently_denied') {
      const nav = navigation.navigate as (...args: unknown[]) => void;
      nav(Routes.Sheet.CameraPermissionDenied);
      return;
    }
    if (permission !== 'granted') return;
    const photo = await capturePhoto();
    if (photo) { onComplete([photo]); navigation.goBack(); }
  }, [onComplete, navigation]);

  return { ...selection, ...pagination, handleBack, handleAdd, handleCameraPress };
}
