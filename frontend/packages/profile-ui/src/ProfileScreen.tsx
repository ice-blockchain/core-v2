import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedTabBar, AnimatedTabPager, useTabViewState, useTheme } from "@ion/ui";
import type { AnimatedTabDefinition } from "@ion/ui";
import { translate } from "@ion/localization";
import { ProfileNavBar } from "./ProfileNavBar";
import { ProfileScrollHeader } from "./ProfileScrollHeader";
import { ProfileTabPage } from "./ProfileTabContent";
import { useProfileScrollAnimation } from "./useProfileScrollAnimation";
import { MOCK_PROFILE } from "./profile-mock-data";
import { PROFILE_NAMESPACE } from "./translations";
import { TAB_PAGE_CONFIG } from "./profile-tab-config";

const NS = PROFILE_NAMESPACE;

function buildTabs(): readonly AnimatedTabDefinition[] {
  return [
    { key: "posts", label: translate(`${NS}:tabPosts`), iconName: "profile-feed" },
    { key: "replies", label: translate(`${NS}:tabReplies`), iconName: "feed-replies" },
    { key: "videos", label: translate(`${NS}:tabVideos`), iconName: "feed-videos" },
    { key: "articles", label: translate(`${NS}:tabArticles`), iconName: "feed-articles" },
  ];
}

function useProfileLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scale = theme.scale.scaleSize;
  return {
    rootStyle: useMemo(() => ({ flex: 1, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]),
    sectionStyle: useMemo(() => ({ paddingHorizontal: scale(16), paddingVertical: scale(12) }), [scale]),
    spacerHeight: insets.top + scale(8),
    tabBarBorderColor: theme.colors.primaryBackground,
  };
}

function usePagerHeight() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const isReady = headerHeight > 0 && scrollViewHeight > 0;
  const pagerHeight = isReady ? scrollViewHeight - headerHeight : 0;
  const pagerStyle = useMemo(() => ({ height: pagerHeight }), [pagerHeight]);

  return { pagerStyle, handleHeaderLayout, handleScrollViewLayout, isReady };
}

export function ProfileScreen() {
  const { position, currentIndex, setPage, pagerRef } = useTabViewState();
  const { rootStyle, sectionStyle, spacerHeight, tabBarBorderColor } = useProfileLayout();
  const { pagerStyle, handleHeaderLayout, handleScrollViewLayout, isReady } = usePagerHeight();
  const scrollAnim = useProfileScrollAnimation();
  const [profile, isCurrentUser] = [MOCK_PROFILE, true] as const;
  const handlePageSelected = useCallback((index: number) => { currentIndex.value = index; }, [currentIndex]);

  return (
    <View style={rootStyle}>
      <scrollAnim.AnimatedScrollView style={styles.scroll} onScroll={scrollAnim.scrollHandler}
        scrollEventThrottle={16} onLayout={handleScrollViewLayout}>
        <View onLayout={handleHeaderLayout}>
          <ProfileScrollHeader spacerHeight={spacerHeight} sectionStyle={sectionStyle}
            profile={profile} isCurrentUser={isCurrentUser} />
          <AnimatedTabBar tabs={buildTabs()} position={position} onTabPress={setPage}
            style={[styles.tabBarWrap, { borderBottomColor: tabBarBorderColor }]} />
        </View>
        {isReady && (
          <AnimatedTabPager ref={pagerRef} position={position} onPageSelected={handlePageSelected} style={pagerStyle}>
            {TAB_PAGE_CONFIG.map((config) => (
              <ProfileTabPage key={config.key} config={config} isCurrentUser={isCurrentUser} username={profile.username} />
            ))}
          </AnimatedTabPager>
        )}
      </scrollAnim.AnimatedScrollView>
      <ProfileNavBar showBackButton={!isCurrentUser} profile={profile}
        collapsedHeaderOpacity={scrollAnim.collapsedHeaderOpacity} navBarBgAnimatedStyle={scrollAnim.navBarBgStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  tabBarWrap: { borderBottomWidth: 4 },
});
