import { translate } from "@ion/localization";
import { ProfileEmptyState } from "./ProfileEmptyState";
import { PROFILE_NAMESPACE } from "./translations";
import type { TabPageConfig } from "./profile-tab-config";

const NS = PROFILE_NAMESPACE;

interface ProfileTabPageProps {
  config: TabPageConfig;
  isCurrentUser: boolean;
  username: string;
}

export function ProfileTabPage({ config, isCurrentUser, username }: ProfileTabPageProps) {
  const text = isCurrentUser
    ? translate(`${NS}:${config.ownKey}`)
    : translate(`${NS}:${config.otherKey}`, { username });

  return <ProfileEmptyState image={config.image} text={text} />;
}
