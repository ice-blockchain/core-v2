import { translate } from "@ion/localization";
import { ProfileEmptyState } from "./ProfileEmptyState";
import { PROFILE_NAMESPACE } from "./translations";
import {
  profileEmptyPostsImage,
  profileEmptyRepliesImage,
  profileEmptyVideoImage,
  profileEmptyArticlesImage,
} from "./profile-images";

const NS = PROFILE_NAMESPACE;

interface ProfileTabContentProps {
  activeIndex: number;
  isCurrentUser: boolean;
  username: string;
}

const TAB_CONFIG = [
  { image: profileEmptyPostsImage, ownKey: "emptyPostsOwn", otherKey: "emptyPostsOther" },
  { image: profileEmptyRepliesImage, ownKey: "emptyRepliesOwn", otherKey: "emptyRepliesOther" },
  { image: profileEmptyVideoImage, ownKey: "emptyVideosOwn", otherKey: "emptyVideosOther" },
  { image: profileEmptyArticlesImage, ownKey: "emptyArticlesOwn", otherKey: "emptyArticlesOther" },
] as const;

export function ProfileTabContent({ activeIndex, isCurrentUser, username }: ProfileTabContentProps) {
  const config = TAB_CONFIG[activeIndex] ?? TAB_CONFIG[0];

  const text = isCurrentUser
    ? translate(`${NS}:${config.ownKey}`)
    : translate(`${NS}:${config.otherKey}`, { username });

  return <ProfileEmptyState image={config.image} text={text} />;
}
