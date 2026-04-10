import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { RichTextFormatState, RichTextActions } from './rich-text-editor-types';

function useFormatState(editor: ReturnType<typeof useEditor>): RichTextFormatState {
  const [formatState, setFormatState] = useState<RichTextFormatState>({ isBold: false, isItalic: false });

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setFormatState({
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
      });
    };

    editor.on('transaction', updateState);
    return () => { editor.off('transaction', updateState); };
  }, [editor]);

  return formatState;
}

export function useRichTextState(_placeholder: string) {
  const editor = useEditor({
    extensions: [StarterKit],
    autofocus: 'end',
  });

  const formatState = useFormatState(editor);

  const toggleBold = useCallback(
    () => editor?.chain().focus().toggleBold().run(),
    [editor],
  );

  const toggleItalic = useCallback(
    () => editor?.chain().focus().toggleItalic().run(),
    [editor],
  );

  const getHTML = useCallback(
    () => Promise.resolve(editor?.getHTML() ?? ''),
    [editor],
  );

  const focus = useCallback(
    () => editor?.chain().focus().run(),
    [editor],
  );

  const actions: RichTextActions = useMemo(
    () => ({ toggleBold, toggleItalic, getHTML, focus }),
    [toggleBold, toggleItalic, getHTML, focus],
  );

  return { editor, formatState, actions };
}
