import type { ReactNode } from "react";

export interface NotificationBarItem {
  key?: string;
  message: string;
  icon?: ReactNode;
  suffixAction?: ReactNode;
  backgroundColor: string;
}

export interface NotificationBarActions {
  show: (item: NotificationBarItem) => void;
  hide: (key: string) => void;
}
