import { useMemo } from 'react';
import { View } from 'react-native';
import { RichText, type EditorBridge } from '@10play/tentap-editor';
import { useTheme } from '@ion/ui';

import { PlaceholderAvatar } from './PlaceholderAvatar';

interface CreatePostComposerProps {
  editor: EditorBridge;
}

function useComposerStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      gap: scale(10),
      paddingHorizontal: scale(16),
      paddingTop: scale(12),
      flex: 1,
    }),
    [scale],
  );

  const editorWrapperStyle = useMemo(
    () => ({ flex: 1, minHeight: scale(40) }),
    [scale],
  );

  return { containerStyle, editorWrapperStyle };
}

export function CreatePostComposer({ editor }: CreatePostComposerProps) {
  const { containerStyle, editorWrapperStyle } = useComposerStyles();

  return (
    <View style={containerStyle}>
      <PlaceholderAvatar />
      <View style={editorWrapperStyle}>
        <RichText editor={editor} />
      </View>
    </View>
  );
}
