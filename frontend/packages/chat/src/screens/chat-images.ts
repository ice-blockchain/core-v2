import type { ImageSourcePropType } from "react-native";

import chatEmptyStateUrl from "../assets/chat-empty-state@3x.png";
import chatEmptyStateDarkUrl from "../assets/chat-empty-state-dark@3x.png";
import newChatEmptyStateUrl from "../assets/new-chat-empty-state@3x.png";
import newChatEmptyStateDarkUrl from "../assets/new-chat-empty-state-dark@3x.png";
import chatDeleteUrl from "../assets/chat-delete@3x.png";

export const chatEmptyStateImage: ImageSourcePropType = { uri: chatEmptyStateUrl as string };
export const chatEmptyStateDarkImage: ImageSourcePropType = { uri: chatEmptyStateDarkUrl as string };
export const newChatEmptyStateImage: ImageSourcePropType = { uri: newChatEmptyStateUrl as string };
export const newChatEmptyStateDarkImage: ImageSourcePropType = { uri: newChatEmptyStateDarkUrl as string };
export const chatDeleteImage: ImageSourcePropType = { uri: chatDeleteUrl as string };
