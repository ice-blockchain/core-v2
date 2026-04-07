import { useCallback, useEffect, useState } from 'react';
import { useSheetNavigation } from '@ion/navigation';
import { fetchDeviceAssets, fetchDeviceAlbums, capturePhoto, checkCameraPermission, requestCameraPermission } from '@ion/feed';
import type { Album, DeviceAsset } from '@ion/feed';
import { useMediaPickerState } from '../components/media-picker/use-media-picker-state';

export function useMediaPickerScreenState(onComplete: (assets: DeviceAsset[]) => void) {
  const navigation = useSheetNavigation();
  const state = useMediaPickerState({ fetchAssets: fetchDeviceAssets });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isAlbumPickerVisible, setIsAlbumPickerVisible] = useState(false);
  const [isCameraPromptVisible, setIsCameraPromptVisible] = useState(false);

  useEffect(() => { state.loadInitial(); fetchDeviceAlbums().then(setAlbums); }, []);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAdd = useCallback(() => {
    const selected = state.assets.filter((a) => state.selectedItems.has(a.id));
    onComplete(selected);
    navigation.goBack();
  }, [state.assets, state.selectedItems, onComplete, navigation]);

  const handleCameraPress = useCallback(async () => {
    const status = await checkCameraPermission();
    if (status === 'granted' || status === 'limited') { await launchCamera(onComplete); return; }
    if (status === 'permanently_denied') { navigation.navigate('Sheet/CameraPermissionDenied' as never); return; }
    setIsCameraPromptVisible(true);
  }, [navigation, onComplete]);

  const handleCameraAllow = useCallback(async () => {
    setIsCameraPromptVisible(false);
    const result = await requestCameraPermission();
    if (result === 'granted' || result === 'limited') await launchCamera(onComplete);
  }, [onComplete]);

  return { ...state, albums, isAlbumPickerVisible, isCameraPromptVisible, handleBack, handleAdd, handleCameraPress, handleCameraAllow, setIsAlbumPickerVisible, setIsCameraPromptVisible };
}

async function launchCamera(onComplete: (assets: DeviceAsset[]) => void) {
  const photo = await capturePhoto();
  if (photo) {
    onComplete([{ id: photo.uri, uri: photo.uri, width: photo.width, height: photo.height, mediaType: 'photo', creationTime: Date.now() }]);
  }
}
