import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { TabDefinition } from "./ProfileTabBar";
import { ProfileNavBar } from "./ProfileNavBar";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import { ProfileTabBar } from "./ProfileTabBar";
import { ProfileTabContent } from "./ProfileTabContent";
import { useProfileScrollAnimation } from "./useProfileScrollAnimation";
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
  const insets = useSafeAreaInsets();
  const scale = theme.scale.scaleSize;

  const rootStyle = useMemo(() => ({ flex: 1, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]);
  const sectionStyle = useMemo(
    () => ({ paddingHorizontal: scale(16), paddingVertical: scale(12) }),
    [scale],
  );
  const spacerHeight = useMemo(() => insets.top + scale(8), [insets.top, scale]);

  return { rootStyle, sectionStyle, spacerHeight };
}

function ProfileScrollContent({ sectionStyle, spacerHeight, profile, isCurrentUser, tabs, activeTab, onTabChange }: {
  sectionStyle: object; spacerHeight: number; profile: typeof MOCK_PROFILE;
  isCurrentUser: boolean; tabs: readonly TabDefinition[]; activeTab: number; onTabChange: (i: number) => void;
}) {
  return (
    <>
      <View style={{ height: spacerHeight }} />
      <ProfileHeader profile={profile} isCurrentUser={isCurrentUser} />
      <View style={sectionStyle}>
        <ProfileStats followingCount={profile.followingCount} followersCount={profile.followersCount} />
      </View>
      <ProfileBio profile={profile} />
      <View style={styles.separatorWrap}><HorizontalSeparator /></View>
      <ProfileTabBar tabs={tabs} activeIndex={activeTab} onTabChange={onTabChange} />
      <ProfileTabContent activeIndex={activeTab} isCurrentUser={isCurrentUser} username={profile.username} />
    </>
  );
}

export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { rootStyle, sectionStyle, spacerHeight } = useProfileStyles();
  const { scrollHandler, collapsedHeaderOpacity, navBarBgStyle, AnimatedScrollView } = useProfileScrollAnimation();
  const profile = MOCK_PROFILE;
  const isCurrentUser = true;
  const tabs = buildTabs();

  return (
    <View style={rootStyle}>
      <AnimatedScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} onScroll={scrollHandler} scrollEventThrottle={16}>
        <ProfileScrollContent sectionStyle={sectionStyle} spacerHeight={spacerHeight} profile={profile}
          isCurrentUser={isCurrentUser} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </AnimatedScrollView>
      <ProfileNavBar showBackButton={!isCurrentUser} profile={profile}
        collapsedHeaderOpacity={collapsedHeaderOpacity} navBarBgAnimatedStyle={navBarBgStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  separatorWrap: { paddingTop: 12 },
});
