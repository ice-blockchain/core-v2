import { useCallback } from "react";
import type { NotificationBarItem } from "./NotificationBarTypes";

function deduplicateStack(stack: NotificationBarItem[], item: NotificationBarItem): NotificationBarItem[] {
  if (!item.key) return [item, ...stack];
  return [item, ...stack.filter((entry) => entry.key !== item.key)];
}

interface NotificationBarActionDeps {
  stackRef: React.RefObject<NotificationBarItem[]>;
  phaseRef: React.RefObject<string>;
  activeItem: NotificationBarItem | null;
  showNext: () => void;
  triggerHide: () => void;
  clearAutoDismiss: () => void;
  startGapTimer: () => void;
  setActiveItem: (item: NotificationBarItem | null) => void;
}

export function useNotificationBarActions(deps: NotificationBarActionDeps) {
  const { stackRef, phaseRef, activeItem, showNext, triggerHide, clearAutoDismiss, startGapTimer, setActiveItem } = deps;

  const show = useCallback((item: NotificationBarItem) => {
    stackRef.current = deduplicateStack(stackRef.current, item);
    if (phaseRef.current === "idle") { showNext(); return; }
    if (phaseRef.current === "showing") { clearAutoDismiss(); triggerHide(); }
  }, [stackRef, phaseRef, showNext, clearAutoDismiss, triggerHide]);

  const hide = useCallback((key: string) => {
    stackRef.current = stackRef.current.filter((e) => e.key !== key);
    if (activeItem?.key === key && phaseRef.current === "showing") {
      clearAutoDismiss();
      triggerHide();
    }
  }, [stackRef, phaseRef, activeItem, clearAutoDismiss, triggerHide]);

  const onHideComplete = useCallback(() => {
    setActiveItem(null);
    if (stackRef.current.length > 0) {
      phaseRef.current = "gap";
      startGapTimer();
    } else {
      phaseRef.current = "idle";
    }
  }, [stackRef, phaseRef, setActiveItem, startGapTimer]);

  return { show, hide, onHideComplete };
}
