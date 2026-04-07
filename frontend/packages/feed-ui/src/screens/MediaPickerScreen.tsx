import { Sheet } from '@ion/navigation';
import { translate } from '@ion/localization';
import type { DeviceAsset } from '@ion/feed';
import { MediaPickerHeader } from '../components/media-picker/MediaPickerHeader';
import { MediaPickerGrid } from '../components/media-picker/MediaPickerGrid';
import { AlbumPickerSheet } from '../components/media-picker/AlbumPickerSheet';
import { PermissionPromptSheet } from '../components/PermissionPromptSheet';
import { IllustrationCameraPermissionPrompt } from '../components/IllustrationCameraPermissionPrompt';
import { useMediaPickerScreenState } from './use-media-picker-screen-state';

interface MediaPickerScreenProps {
  onComplete: (assets: DeviceAsset[]) => void;
}

export function MediaPickerSheetScreen({ onComplete }: MediaPickerScreenProps) {
  const state = useMediaPickerScreenState(onComplete);
  const albumTitle = state.currentAlbum?.title ?? translate('feed:allMediaTitle');

  return (
    <Sheet onClose={state.handleBack}>
      <MediaPickerHeader albumTitle={albumTitle} selectedCount={state.selectedCount} onBack={state.handleBack} onAlbumPress={() => state.setIsAlbumPickerVisible(true)} onAdd={state.handleAdd} />
      <MediaPickerGrid assets={state.assets} selectedItems={state.selectedItems} isMaxSelected={state.isMaxSelected} onToggleSelection={state.toggleSelection} onCameraPress={state.handleCameraPress} onEndReached={state.loadMore} />
      <AlbumPickerSheet isVisible={state.isAlbumPickerVisible} albums={state.albums} selectedAlbumId={state.currentAlbum?.id ?? null} onSelect={(album) => { state.switchAlbum(album); state.setIsAlbumPickerVisible(false); }} onClose={() => state.setIsAlbumPickerVisible(false)} />
      <PermissionPromptSheet isVisible={state.isCameraPromptVisible} onAllow={state.handleCameraAllow} onDismiss={() => state.setIsCameraPromptVisible(false)} illustration={<IllustrationCameraPermissionPrompt />} title={translate('feed:allowCameraAccessTitle')} description={translate('feed:allowCameraAccessDescription')} />
    </Sheet>
  );
}
