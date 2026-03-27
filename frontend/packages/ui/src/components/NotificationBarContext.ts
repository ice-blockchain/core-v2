import { createContext } from "react";
import type { NotificationBarActions } from "./NotificationBarTypes";

export const NotificationBarContext = createContext<NotificationBarActions | null>(null);
