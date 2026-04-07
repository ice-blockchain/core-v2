import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Sheet, useSheetNavigation } from '@ion/navigation';
import { translate } from '@ion/localization';

import { CreatePostHeader } from '../components/CreatePostHeader';
import { CreatePostComposer } from '../components/CreatePostComposer';
import { CreatePostVisibilityBar } from '../components/CreatePostVisibilityBar';
import { CreatePostToolbar } from '../components/CreatePostToolbar';

export function CreatePostSheetScreen() {
  const navigation = useSheetNavigation();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Sheet onClose={handleClose} title={translate('feed:newPostTitle')} titleVisible onBack={handleClose}>
      <View style={styles.content}>
        <CreatePostHeader />
        <CreatePostComposer />
        <View style={styles.spacer} />
        <CreatePostVisibilityBar />
        <CreatePostToolbar />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  spacer: { flex: 1 },
});
