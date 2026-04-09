import { useCallback, useRef, useState } from "react";
import type { View } from "react-native";
import type { Conversation } from "../types";
import type { ContextMenuState } from "./context-menu-types";

export function useConversationContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const rowRefs = useRef<Record<string, View | null>>({});

  const setRowRef = useCallback((id: string, ref: View | null) => {
    rowRefs.current[id] = ref;
  }, []);

  const show = useCallback((conversation: Conversation) => {
    const row = rowRefs.current[conversation.id];
    if (!row) return;
    row.measureInWindow((...measurements: [number, number, number, number]) => {
      const [x, y, width, height] = measurements;
      setState({ conversation, layout: { x, y, width, height } });
    });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { state, show, close, setRowRef };
}
