import { useCallback, useState } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import type { DeviceAsset } from '@ion/feed';
import { requestGalleryPermission } from '@ion/feed';

export function useCreatePostState() {
  const navigation = useSheetNavigation();
  const [attachedMedia, setAttachedMedia] = useState<DeviceAsset[]>([]);

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleRemoveMedia = useCallback((index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMediaSelected = useCallback((assets: DeviceAsset[]) => {
    setAttachedMedia((prev) => [...prev, ...assets]);
  }, []);

  const handleGalleryPress = useCallback(async () => {
    const permission = await requestGalleryPermission();
    const nav = navigation.navigate as (...args: unknown[]) => void;
    if (permission === 'granted' || permission === 'limited') {
      nav(Routes.Sheet.MediaPicker, { onComplete: handleMediaSelected });
      return;
    }
    if (permission === 'permanently_denied') {
      nav(Routes.Sheet.GalleryPermissionDenied);
    }
  }, [navigation, handleMediaSelected]);

  return { attachedMedia, handleClose, handleRemoveMedia, handleGalleryPress };
}
