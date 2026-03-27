import type { NotificationBarActions, NotificationBarItem } from "./NotificationBarTypes";

let globalRef: NotificationBarActions | null = null;

export function setNotificationBarGlobalRef(ref: NotificationBarActions): void {
  globalRef = ref;
}

export function clearNotificationBarGlobalRef(): void {
  globalRef = null;
}

export const notificationBarRef: NotificationBarActions = {
  show: (item: NotificationBarItem) => globalRef?.show(item),
  hide: (key: string) => globalRef?.hide(key),
};
