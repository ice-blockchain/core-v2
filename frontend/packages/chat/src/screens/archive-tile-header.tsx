import { Pressable } from "react-native";
import { HorizontalSeparator } from "@ion/ui";
import { ConversationRow } from "../components/conversation-row";
import type { Conversation } from "../types";

interface ArchiveTileHeaderProps {
  readonly conversation: Conversation;
  readonly onPress: () => void;
}

export function ArchiveTileHeader({ conversation, onPress }: ArchiveTileHeaderProps) {
  return (
    <>
      <Pressable onPress={onPress}>
        <ConversationRow conversation={conversation} />
      </Pressable>
      <HorizontalSeparator />
    </>
  );
}
