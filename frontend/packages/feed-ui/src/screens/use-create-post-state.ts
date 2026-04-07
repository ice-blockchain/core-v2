import { useCallback, useState } from 'react';
import { useSheetNavigation, Routes } from '@ion/navigation';
import { checkGalleryPermission, requestGalleryPermission } from '@ion/feed';
import type { DeviceAsset } from '@ion/feed';

export function useCreatePostState() {
  const navigation = useSheetNavigation();
  const [attachedMedia, setAttachedMedia] = useState<DeviceAsset[]>([]);
  const [isGalleryPromptVisible, setIsGalleryPromptVisible] = useState(false);

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleRemoveMedia = useCallback((index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openMediaPicker = useCallback(() => {
    navigation.navigate(Routes.Sheet.MediaPicker as never);
  }, [navigation]);

  const handleGalleryPress = useCallback(async () => {
    const status = await checkGalleryPermission();
    if (status === 'granted' || status === 'limited') { openMediaPicker(); return; }
    if (status === 'permanently_denied') { navigation.navigate(Routes.Sheet.GalleryPermissionDenied as never); return; }
    setIsGalleryPromptVisible(true);
  }, [openMediaPicker, navigation]);

  const handleGalleryAllow = useCallback(async () => {
    setIsGalleryPromptVisible(false);
    const result = await requestGalleryPermission();
    if (result === 'granted' || result === 'limited') openMediaPicker();
  }, [openMediaPicker]);

  const dismissGalleryPrompt = useCallback(() => setIsGalleryPromptVisible(false), []);

  return { attachedMedia, isGalleryPromptVisible, handleClose, handleRemoveMedia, handleGalleryPress, handleGalleryAllow, dismissGalleryPrompt };
}
