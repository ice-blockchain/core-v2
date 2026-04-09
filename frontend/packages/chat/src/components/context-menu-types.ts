import type { Conversation } from "../types";

export interface ContextMenuLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ContextMenuState {
  readonly conversation: Conversation;
  readonly layout: ContextMenuLayout;
}
