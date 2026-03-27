import { useCallback, useRef, useState } from "react";
import type { NotificationBarItem } from "./NotificationBarTypes";
import { useNotificationBarTimers } from "./useNotificationBarTimers";
import { useNotificationBarActions } from "./useNotificationBarActions";

export function useNotificationBarStack() {
  const [activeItem, setActiveItem] = useState<NotificationBarItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const stackRef = useRef<NotificationBarItem[]>([]);
  const phaseRef = useRef<string>("idle");

  const showNext = useCallback(() => {
    const next = stackRef.current[0];
    if (!next) { phaseRef.current = "idle"; return; }
    stackRef.current = stackRef.current.slice(1);
    setActiveItem(next);
    setIsVisible(true);
    phaseRef.current = "showing";
  }, []);

  const triggerHide = useCallback(() => {
    setIsVisible(false);
    phaseRef.current = "hiding";
  }, []);

  const { clearAutoDismiss, startGapTimer } = useNotificationBarTimers({
    activeItem, phase: phaseRef, onAutoDismiss: triggerHide, onGapComplete: showNext,
  });

  const { show, hide, onHideComplete } = useNotificationBarActions({
    stackRef, phaseRef, activeItem, showNext, triggerHide, clearAutoDismiss, startGapTimer, setActiveItem,
  });

  return { activeItem, isVisible, show, hide, onHideComplete };
}
