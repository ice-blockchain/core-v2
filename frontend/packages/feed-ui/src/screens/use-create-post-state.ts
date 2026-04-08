import { useCallback, useState } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import type { DeviceAsset } from '@ion/feed';
import { requestGalleryPermission } from '@ion/feed';

const MAX_TOTAL_ATTACHMENTS = 10;

function useAttachedMedia() {
  const [attachedMedia, setAttachedMedia] = useState<DeviceAsset[]>([]);

  const handleRemoveMedia = useCallback((index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMediaSelected = useCallback((assets: DeviceAsset[]) => {
    setAttachedMedia((prev) => {
      const remainingSlots = MAX_TOTAL_ATTACHMENTS - prev.length;
      if (remainingSlots <= 0) return prev;
      return [...prev, ...assets.slice(0, remainingSlots)];
    });
  }, []);

  return { attachedMedia, handleRemoveMedia, handleMediaSelected };
}

export function useCreatePostState() {
  const navigation = useSheetNavigation();
  const { attachedMedia, handleRemoveMedia, handleMediaSelected } = useAttachedMedia();

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleGalleryPress = useCallback(async () => {
    try {
      const permission = await requestGalleryPermission();
      const nav = navigation.navigate as (...args: unknown[]) => void;
      if (permission === 'granted' || permission === 'limited') {
        nav(Routes.Sheet.MediaPicker, { onComplete: handleMediaSelected });
        return;
      }
      if (permission === 'permanently_denied') {
        nav(Routes.Sheet.GalleryPermissionDenied);
      }
    } catch (error) {
      console.error('Failed to request gallery permission', error);
    }
  }, [navigation, handleMediaSelected]);

  return { attachedMedia, handleClose, handleRemoveMedia, handleGalleryPress };
}
