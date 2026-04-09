import { useCallback } from 'react';
import { Sheet, useSheetNavigation } from '@ion/navigation';
import { translate } from '@ion/localization';
import { openDeviceSettings } from '@ion/feed';
import { PermissionDeniedContent } from '../components/PermissionDeniedContent';
import { IllustrationGalleryDenied } from '../components/IllustrationGalleryDenied';

export function GalleryPermissionDeniedScreen() {
  const navigation = useSheetNavigation();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleGoToSettings = useCallback(async () => {
    try {
      await openDeviceSettings();
    } catch (error) {
      console.error('Failed to open device settings', error);
    }
  }, []);

  return (
    <Sheet onClose={handleClose}>
      <PermissionDeniedContent
        iconName="gallery-open"
        headerTitle={translate('feed:galleryPermissionTitle')}
        illustration={<IllustrationGalleryDenied />}
        bodyTitle={translate('feed:noGalleryAccessTitle')}
        bodyDescription={translate('feed:permissionDeniedDescription')}
        buttonLabel={translate('feed:goToSettingsButton')}
        onGoToSettings={handleGoToSettings}
      />
    </Sheet>
  );
}
