import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { HorizontalSeparator, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { TabDefinition } from "./ProfileTabBar";
import { ProfileNavBar } from "./ProfileNavBar";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import { ProfileTabBar } from "./ProfileTabBar";
import { ProfileTabContent } from "./ProfileTabContent";
import { MOCK_PROFILE } from "./profile-mock-data";
import { PROFILE_NAMESPACE } from "./translations";

const NS = PROFILE_NAMESPACE;

function buildTabs(): readonly TabDefinition[] {
  return [
    { key: "posts", label: translate(`${NS}:tabPosts`), iconName: "profile-feed" },
    { key: "replies", label: translate(`${NS}:tabReplies`), iconName: "feed-replies" },
    { key: "videos", label: translate(`${NS}:tabVideos`), iconName: "feed-videos" },
    { key: "articles", label: translate(`${NS}:tabArticles`), iconName: "feed-articles" },
  ];
}

function useProfileStyles() {
  const theme = useTheme();
  const rootStyle = useMemo(() => ({ flex: 1, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]);
  const sectionStyle = useMemo(
    () => ({ paddingHorizontal: theme.scale.scaleSize(16), paddingVertical: theme.scale.scaleSize(12) }),
    [theme.scale],
  );
  return { rootStyle, sectionStyle };
}

export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { rootStyle, sectionStyle } = useProfileStyles();
  const profile = MOCK_PROFILE;
  const isCurrentUser = true;
  const tabs = buildTabs();

  return (
    <View style={rootStyle}>
      <ProfileNavBar showBackButton={!isCurrentUser} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProfileHeader profile={profile} isCurrentUser={isCurrentUser} />
        <View style={sectionStyle}>
          <ProfileStats followingCount={profile.followingCount} followersCount={profile.followersCount} />
        </View>
        <ProfileBio profile={profile} />
        <View style={styles.separatorWrap}>
          <HorizontalSeparator />
        </View>
        <ProfileTabBar tabs={tabs} activeIndex={activeTab} onTabChange={setActiveTab} />
        <ProfileTabContent activeIndex={activeTab} isCurrentUser={isCurrentUser} username={profile.username} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  separatorWrap: { paddingTop: 12 },
});
