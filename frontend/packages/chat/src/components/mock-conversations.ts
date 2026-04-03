import type { Conversation } from "../types";

export const MOCK_CONVERSATIONS: readonly Conversation[] = [
  { id: "1", name: "Archive", preview: "OXK Community, Binance Labs...", time: "11:23", unreadCount: 9 },
  { id: "2", name: "Alicia Wernet", preview: "Hey, did you receive the news?", time: "09:31", unreadCount: 1 },
  { id: "3", name: "Ton Community", preview: "Photo", time: "08:11" },
  { id: "4", name: "Ice Open Network", preview: "Hi, Join us for an exclusive AMA...", time: "31.09" },
  { id: "5", name: "Diedo Shonli", preview: "Are you sure? I haven't heard of.", time: "30.09" },
  { id: "6", name: "Bitcoin Adept", preview: "In the coming days, we will find out...", time: "30.09", unreadCount: 1 },
];
