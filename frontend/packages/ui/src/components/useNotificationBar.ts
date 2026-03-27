import { useContext } from "react";
import { NotificationBarContext } from "./NotificationBarContext";
import type { NotificationBarActions } from "./NotificationBarTypes";

export function useNotificationBar(): NotificationBarActions {
  const context = useContext(NotificationBarContext);
  if (!context) {
    throw new Error("useNotificationBar must be used within a NotificationBarProvider");
  }
  return context;
}
