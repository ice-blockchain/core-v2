import type { ImageSourcePropType } from "react-native";

import chatEmptyStateUrl from "../assets/chat-empty-state@3x.png";
import chatDeleteUrl from "../assets/chat-delete@3x.png";

export const chatEmptyStateImage: ImageSourcePropType = { uri: chatEmptyStateUrl as string };
export const chatDeleteImage: ImageSourcePropType = { uri: chatDeleteUrl as string };
