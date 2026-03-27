import { useCallback, useEffect, useRef } from "react";
import type { NotificationBarItem } from "./NotificationBarTypes";

const AUTO_DISMISS_DURATION = 3000;
const GAP_DURATION = 100;

interface NotificationBarTimersOptions {
  activeItem: NotificationBarItem | null;
  phase: React.RefObject<string>;
  onAutoDismiss: () => void;
  onGapComplete: () => void;
}

export function useNotificationBarTimers(options: NotificationBarTimersOptions) {
  const { activeItem, phase, onAutoDismiss, onGapComplete } = options;
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }, []);

  const startGapTimer = useCallback(() => {
    if (gapRef.current) clearTimeout(gapRef.current);
    gapRef.current = setTimeout(onGapComplete, GAP_DURATION);
  }, [onGapComplete]);

  useEffect(() => {
    if (phase.current !== "showing" || !activeItem) return;
    if (activeItem.key) return;
    autoDismissRef.current = setTimeout(onAutoDismiss, AUTO_DISMISS_DURATION);
    return clearAutoDismiss;
  }, [activeItem, onAutoDismiss, clearAutoDismiss, phase]);

  useEffect(() => {
    return () => {
      clearAutoDismiss();
      if (gapRef.current) clearTimeout(gapRef.current);
    };
  }, [clearAutoDismiss]);

  return { clearAutoDismiss, startGapTimer };
}
