import { useCallback, useState } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import type { DeviceAsset } from '@ion/feed';

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

  const handleGalleryPress = useCallback(() => {
    const nav = navigation.navigate as (...args: unknown[]) => void;
    nav(Routes.Sheet.MediaPicker, { onComplete: handleMediaSelected });
  }, [navigation, handleMediaSelected]);

  return { attachedMedia, handleClose, handleRemoveMedia, handleGalleryPress };
}
