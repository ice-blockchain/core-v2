export type Conversation = {
  readonly id: string;
  readonly name: string;
  readonly preview: string;
  readonly time: string;
  readonly unreadCount?: number;
  readonly isFolder?: boolean;
};
