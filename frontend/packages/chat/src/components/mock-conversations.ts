import type { Conversation } from "../types";

export const MOCK_CONVERSATIONS: readonly Conversation[] = [
  { id: "1", name: "Archive", preview: "OXK Community, Binance Labs...", time: "11:23", unreadCount: 9, isFolder: true },
  { id: "2", name: "Alicia Wernet", preview: "Hey, did you receive the news?", time: "09:31", unreadCount: 1 },
  { id: "3", name: "Ton Community", preview: "Photo", time: "08:11" },
  { id: "4", name: "Ice Open Network", preview: "Hi, Join us for an exclusive AMA...", time: "31.09" },
  { id: "5", name: "Diedo Shonli", preview: "Are you sure? I haven't heard of.", time: "30.09" },
  { id: "6", name: "Bitcoin Adept", preview: "In the coming days, we will find out...", time: "30.09", unreadCount: 1 },
];

export const MOCK_ARCHIVED_CONVERSATIONS: readonly Conversation[] = [
  { id: "a1", name: "OXK Community", preview: "Welcome to OXK!", time: "11:20", unreadCount: 5 },
  { id: "a2", name: "Binance Labs", preview: "New investment opportunity...", time: "10:45", unreadCount: 4 },
  { id: "a3", name: "Old Project Group", preview: "Final report attached", time: "29.09" },
];
