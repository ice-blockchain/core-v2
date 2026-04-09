export type Conversation = {
  readonly id: string;
  readonly name: string;
  readonly username?: string;
  readonly avatarUrl?: string;
  readonly isVerified?: boolean;
  readonly preview: string;
  readonly time: string;
  readonly unreadCount?: number;
  readonly isFolder?: boolean;
};
