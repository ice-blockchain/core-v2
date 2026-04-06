import { colorPalette } from "@ion/ui";
import { translate } from "@ion/localization";
import type { BottomNavBarSheetAction, BottomNavBarTabIndex } from "@ion/ui";
import { MAIN_SHELL_NAMESPACE } from "./translations";

const NS = MAIN_SHELL_NAMESPACE;

function noop() {}

function buildFeedActions(successColor: string): BottomNavBarSheetAction[] {
  return [
    { iconName: "feed-post", iconBackgroundColor: colorPalette.purple, title: translate(`${NS}:postAction`), description: translate(`${NS}:postDescription`), onPress: noop },
    { iconName: "feed-stories", iconBackgroundColor: colorPalette.orangePeel, title: translate(`${NS}:storyAction`), description: translate(`${NS}:storyDescription`), onPress: noop },
    { iconName: "videos-trading", iconBackgroundColor: colorPalette.raspberry, title: translate(`${NS}:videoAction`), description: translate(`${NS}:videoDescription`), onPress: noop },
    { iconName: "articles", iconBackgroundColor: successColor, title: translate(`${NS}:articleAction`), description: translate(`${NS}:articleDescription`), onPress: noop },
  ];
}

function buildChatActions(): BottomNavBarSheetAction[] {
  return [
    { iconName: "chat-createnew", iconBackgroundColor: colorPalette.orangePeel, title: translate(`${NS}:newChatAction`), description: translate(`${NS}:newChatDescription`), onPress: noop },
  ];
}

function buildWalletActions(successColor: string): BottomNavBarSheetAction[] {
  return [
    { iconName: "send", iconBackgroundColor: colorPalette.orangePeel, title: translate(`${NS}:sendAction`), description: translate(`${NS}:sendDescription`), onPress: noop },
    { iconName: "button-receive", iconBackgroundColor: successColor, title: translate(`${NS}:receiveAction`), description: translate(`${NS}:receiveDescription`), onPress: noop },
    { iconName: "swap", iconBackgroundColor: colorPalette.purple, title: translate(`${NS}:swapAction`), description: translate(`${NS}:swapDescription`), onPress: noop },
  ];
}

interface SheetConfig {
  title: string;
  actions: BottomNavBarSheetAction[];
}

export function buildSheetConfigs(successColor: string): Record<BottomNavBarTabIndex, SheetConfig> {
  const feedActions = buildFeedActions(successColor);
  return {
    0: { title: translate(`${NS}:createValueTitle`), actions: feedActions },
    1: { title: translate(`${NS}:startConversationTitle`), actions: buildChatActions() },
    2: { title: translate(`${NS}:createTransactionTitle`), actions: buildWalletActions(successColor) },
    3: { title: translate(`${NS}:createValueTitle`), actions: feedActions },
  };
}
