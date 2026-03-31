import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ViewStyle } from "react-native";
import { Button, useTheme } from "@ion/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetNavigation, Routes, Sheet } from "@ion/navigation";
import { CreatorRow } from "../components/CreatorRow";
import { CreatorRowSkeletonList } from "../components/CreatorRowSkeleton";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";
import { SheetScreenHeader } from "../components/SheetScreenHeader";
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

export function DiscoverCreatorsScreen() {
  const navigation = useSheetNavigation();
  const styles = useScreenStyles();

  const navigateNext = useCallback(() => {
    navigation.navigate(Routes.Sheet.Notifications);
  }, [navigation]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const [state, actions] = useDiscoverCreators(navigateNext);

  return (
    <Sheet onClose={handleBack}>
      <View style={styles.container} testID="discover-creators-screen">
        <SheetScreenHeader onBack={handleBack} />
        <BottomSheetScrollView>
          <OnboardingScreenTitle title="Discover creators" subtitle="Connect with visionaries and inspiring voices" />
          {state.isLoading ? (
            <View style={styles.listContainer}><CreatorRowSkeletonList /></View>
          ) : (
            <View style={styles.listContainer}>
              <CreatorList state={state} actions={actions} contentStyle={styles.listContent} />
            </View>
          )}
        </BottomSheetScrollView>
        <View style={styles.floatingFooter}>
          <Button label="Continue" onPress={actions.handleContinue} />
        </View>
      </View>
    </Sheet>
  );
}
