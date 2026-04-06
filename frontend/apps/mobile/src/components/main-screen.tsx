import { MainScreen as MainScreenCore } from "@ion/main-tabs-ui";
import { FeedPlaceholder } from "./placeholders/feed-placeholder";
import { ChatPlaceholder } from "./placeholders/chat-placeholder";
import { WalletPlaceholder } from "./placeholders/wallet-placeholder";
import { ProfilePlaceholder } from "./placeholders/profile-placeholder";

const SCREENS = {
  Feed: FeedPlaceholder,
  Chat: ChatPlaceholder,
  Wallet: WalletPlaceholder,
  Profile: ProfilePlaceholder,
};

export function MainScreen() {
  return <MainScreenCore screens={SCREENS} />;
}
