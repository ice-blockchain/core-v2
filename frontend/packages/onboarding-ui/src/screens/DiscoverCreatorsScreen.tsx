import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ViewStyle } from "react-native";
import { Button, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { CreatorRow } from "../components/CreatorRow";
import { CreatorRowSkeletonList } from "../components/CreatorRowSkeleton";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";
import type { DiscoverCreatorsState } from "./discover-creators-hooks";
import { useDiscoverCreators } from "./discover-creators-hooks";
import { buildListContainerStyle, buildListContentStyle } from "./discover-creators-styles";

function CreatorList({ state, actions, contentStyle }: {
  state: DiscoverCreatorsState;
  actions: { toggleFollow: (id: string) => void };
  contentStyle: ViewStyle;
}) {
  return (
    <View style={contentStyle}>
      {state.creators.map((item) => (
        <CreatorRow
          key={item.id}
          avatarUrl={item.avatarUrl}
          name={item.name}
          handle={item.handle}
          isVerified={item.isVerified}
          isFollowing={state.followedIds.has(item.id)}
          onToggleFollow={() => actions.toggleFollow(item.id)}
          testID={`creator-${item.id}`}
        />
      ))}
    </View>
  );
}

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  return {
    container: useMemo(() => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]),
    listContainer: useMemo(() => buildListContainerStyle(scale), [scale]),
    listContent: useMemo(() => buildListContentStyle(scale), [scale]),
    floatingFooter: useMemo((): ViewStyle => ({
      position: "absolute",
      bottom: scale(10) + insets.bottom,
      left: 0,
      right: 0,
      paddingHorizontal: scale(16),
    }), [scale, insets.bottom]),
  };
}

function DiscoverCreatorsContent({ state, actions, styles }: {
  state: DiscoverCreatorsState;
  actions: ReturnType<typeof useDiscoverCreators>[1];
  styles: ReturnType<typeof useScreenStyles>;
}) {
  const sheetScroll = useSheetScroll();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16}>
      <OnboardingScreenTitle
        title={translate("onboarding:discoverCreatorsTitle")}
        subtitle={translate("onboarding:discoverCreatorsSubtitle")}
      />
      {state.isLoading ? (
        <View style={styles.listContainer}>
          <CreatorRowSkeletonList />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <CreatorList state={state} actions={actions} contentStyle={styles.listContent} />
        </View>
      )}
    </BottomSheetScrollView>
  );
}

export function DiscoverCreatorsScreen() {
  const navigation = useAuthNavigation();
  const styles = useScreenStyles();

  const navigateNext = useCallback(() => {
    navigation.navigate(Routes.Auth.Notifications);
  }, [navigation]);

  const [state, actions] = useDiscoverCreators(navigateNext);

  return (
    <View style={styles.container} testID="discover-creators-screen">
      <DiscoverCreatorsContent state={state} actions={actions} styles={styles} />
      <View style={styles.floatingFooter}>
        <Button label={translate("onboarding:continueButton")} onPress={actions.handleContinue} />
      </View>
    </View>
  );
}
