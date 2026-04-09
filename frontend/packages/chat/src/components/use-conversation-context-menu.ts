import { useCallback, useRef, useState } from "react";
import type { View } from "react-native";
import type { Conversation } from "../types";
import type { ContextMenuState } from "./context-menu-types";

export function useConversationContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const rowRefs = useRef<Record<string, View | null>>({});
  const refCallbacks = useRef<Record<string, (ref: View | null) => void>>({});

  const getRowRef = useCallback((id: string) => {
    if (!refCallbacks.current[id]) {
      refCallbacks.current[id] = (ref: View | null) => {
        if (ref) {
          rowRefs.current[id] = ref;
        } else {
          delete rowRefs.current[id];
        }
      };
    }
    return refCallbacks.current[id];
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

  return { state, show, close, getRowRef };
}
