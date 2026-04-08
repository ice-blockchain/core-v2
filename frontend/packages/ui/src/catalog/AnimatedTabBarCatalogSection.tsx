import { StyleSheet, View } from "react-native";
import { CatalogSection } from "./CatalogSection";
import { AnimatedTabBar } from "../components/AnimatedTabBar";
import { AnimatedTabPager } from "../components/AnimatedTabPager";
import { useTabViewState } from "../components/use-tab-view-state";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import type { AnimatedTabDefinition } from "../components/animated-tab-view-types";

const DEMO_TABS: readonly AnimatedTabDefinition[] = [
  { key: "posts", label: "Posts", iconName: "profile-feed" },
  { key: "replies", label: "Replies", iconName: "feed-replies" },
  { key: "videos", label: "Videos", iconName: "feed-videos" },
  { key: "articles", label: "Articles", iconName: "feed-articles" },
];

function TabPageContent({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.page}>
      <Text variant="body2" color={theme.colors.tertiaryText}>{label} content</Text>
    </View>
  );
}

export function AnimatedTabBarCatalogSection() {
  const { position, setPage, pagerRef } = useTabViewState();

  return (
    <CatalogSection title="Animated Tab Bar">
      <AnimatedTabBar tabs={DEMO_TABS} position={position} onTabPress={setPage} />
      <AnimatedTabPager ref={pagerRef} position={position} style={styles.pager}>
        {DEMO_TABS.map((tab) => (
          <TabPageContent key={tab.key} label={tab.label} />
        ))}
      </AnimatedTabPager>
    </CatalogSection>
  );
}

const styles = StyleSheet.create({
  pager: { height: 120 },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
});
