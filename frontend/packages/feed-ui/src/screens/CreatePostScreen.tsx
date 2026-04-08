import { View, StyleSheet } from 'react-native';
import { Sheet } from '@ion/navigation';
import { translate } from '@ion/localization';

import { CreatePostHeader } from '../components/CreatePostHeader';
import { CreatePostComposer } from '../components/CreatePostComposer';
import { CreatePostVisibilityBar } from '../components/CreatePostVisibilityBar';
import { CreatePostToolbar } from '../components/CreatePostToolbar';
import { AttachedMediaCarousel } from '../components/AttachedMediaCarousel';
import { useCreatePostState } from './use-create-post-state';

export function CreatePostSheetScreen() {
  const state = useCreatePostState();

  return (
    <Sheet onClose={state.handleClose} title={translate('feed:newPostTitle')} titleVisible onBack={state.handleClose}>
      <View style={styles.content}>
        <CreatePostHeader />
        <CreatePostComposer />
        <AttachedMediaCarousel items={state.attachedMedia} onRemove={state.handleRemoveMedia} />
        <View style={styles.spacer} />
        <CreatePostVisibilityBar />
        <CreatePostToolbar onGalleryPress={state.handleGalleryPress} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  spacer: { flex: 1 },
});
