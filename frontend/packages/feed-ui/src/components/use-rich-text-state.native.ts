import { useCallback, useMemo } from 'react';
import { useEditorBridge, useBridgeState } from '@10play/tentap-editor';
import { useTheme } from '@ion/ui';
import type { RichTextFormatState, RichTextActions } from './rich-text-editor-types';

function useEditorTheme() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return useMemo(
    () => ({
      toolbar: { toolbarBody: { display: 'none' as const } },
      webview: { backgroundColor: 'transparent' },
      content: {
        body: {
          fontFamily: 'NotoSans-Regular',
          fontSize: `${scale(13)}px`,
          color: theme.colors.primaryText,
          padding: '0',
          margin: '0',
        },
        paragraph: { margin: '0', lineHeight: '1.38' },
      },
      placeholder: { color: theme.colors.quaternaryText },
    }),
    [theme, scale],
  );
}

export function useRichTextState(_placeholder: string) {
  const editorTheme = useEditorTheme();

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    dynamicHeight: true,
    theme: editorTheme,
  });

  const editorState = useBridgeState(editor);

  const formatState: RichTextFormatState = useMemo(
    () => ({
      isBold: 'isBoldActive' in editorState ? Boolean(editorState.isBoldActive) : false,
      isItalic: 'isItalicActive' in editorState ? Boolean(editorState.isItalicActive) : false,
    }),
    [editorState],
  );

  const toggleBold = useCallback(() => editor.toggleBold(), [editor]);
  const toggleItalic = useCallback(() => editor.toggleItalic(), [editor]);
  const getHTML = useCallback(() => editor.getHTML(), [editor]);
  const focus = useCallback(() => editor.focus('end'), [editor]);

  const actions: RichTextActions = useMemo(
    () => ({ toggleBold, toggleItalic, getHTML, focus }),
    [toggleBold, toggleItalic, getHTML, focus],
  );

  return { editor, formatState, actions };
}
