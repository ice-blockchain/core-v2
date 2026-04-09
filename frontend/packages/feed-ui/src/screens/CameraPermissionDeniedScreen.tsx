import { useCallback } from 'react';
import { Sheet, useSheetNavigation } from '@ion/navigation';
import { translate } from '@ion/localization';
import { openDeviceSettings } from '@ion/feed';
import { PermissionDeniedContent } from '../components/PermissionDeniedContent';
import { IllustrationCameraDenied } from '../components/IllustrationCameraDenied';

export function CameraPermissionDeniedScreen() {
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
        iconName="camera"
        headerTitle={translate('feed:cameraPermissionTitle')}
        illustration={<IllustrationCameraDenied />}
        bodyTitle={translate('feed:noCameraAccessTitle')}
        bodyDescription={translate('feed:permissionDeniedDescription')}
        buttonLabel={translate('feed:goToSettingsButton')}
        onGoToSettings={handleGoToSettings}
      />
    </Sheet>
  );
}
