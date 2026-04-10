import { useCallback, useState } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import type { DeviceAsset } from '@ion/feed';
import { requestGalleryPermission } from '@ion/feed';
import { translate } from '@ion/localization';

import { useRichTextState } from '../components/use-rich-text-state';

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
  const richText = useRichTextState(translate('feed:composerPlaceholder'));

  const handleClose = useCallback(
    () => navigation.navigate(Routes.Sheet.CancelPost),
    [navigation],
  );

  const handleGalleryPress = useCallback(async () => {
    try {
      const permission = await requestGalleryPermission();
      if (permission === 'granted' || permission === 'limited') {
        navigation.navigate(Routes.Sheet.MediaPicker, { onComplete: handleMediaSelected });
        return;
      }
      navigation.navigate(Routes.Sheet.GalleryPermissionDenied);
    } catch (error) {
      console.error('Failed to request gallery permission', error);
    }
  }, [navigation, handleMediaSelected]);

  return { attachedMedia, handleClose, handleRemoveMedia, handleGalleryPress, richText };
}
