import { useCallback, useMemo } from "react";
import { FlatList, View } from "react-native";
import type { ListRenderItemInfo, ViewStyle } from "react-native";
import { BottomSheet, Button, useTheme } from "@ion/ui";
import type { Creator } from "@ion/onboarding";
import type { OnboardingScreenProps } from "../types";
import { CreatorRow } from "../components/CreatorRow";
import { CreatorRowSkeletonList } from "../components/CreatorRowSkeleton";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";
import type { DiscoverCreatorsActions, DiscoverCreatorsState } from "./discover-creators-hooks";
import { useDiscoverCreators } from "./discover-creators-hooks";
import { buildListContainerStyle, buildListContentStyle } from "./discover-creators-styles";

function buildSeparatorStyle(scale: (n: number) => number): ViewStyle {
  return { height: scale(12) };
}

function ItemSeparator({ style }: { style: ViewStyle }) {
  return <View style={style} />;
}

function useCreatorListCallbacks(state: DiscoverCreatorsState, actions: DiscoverCreatorsActions, separatorStyle: ViewStyle) {
  const renderItem = useCallback(({ item }: ListRenderItemInfo<Creator>) => (
    <CreatorRow
      avatarUrl={item.avatarUrl}
      name={item.name}
      handle={item.handle}
      isVerified={item.isVerified}
      isFollowing={state.followedIds.has(item.id)}
      onToggleFollow={() => actions.toggleFollow(item.id)}
      testID={`creator-${item.id}`}
    />
  ), [state.followedIds, actions]);

  const renderSeparator = useCallback(() => <ItemSeparator style={separatorStyle} />, [separatorStyle]);
  const keyExtractor = useCallback((item: Creator) => item.id, []);

  return { renderItem, renderSeparator, keyExtractor };
}

function CreatorList({ state, actions, containerStyle, contentStyle, separatorStyle }: {
  state: DiscoverCreatorsState;
  actions: DiscoverCreatorsActions;
  containerStyle: ViewStyle;
  contentStyle: ViewStyle;
  separatorStyle: ViewStyle;
}) {
  const { renderItem, renderSeparator, keyExtractor } = useCreatorListCallbacks(state, actions, separatorStyle);

  return (
    <View style={containerStyle}>
      <FlatList
        data={state.creators}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={contentStyle}
        onEndReached={actions.loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const listContainerStyle = useMemo(() => buildListContainerStyle(scale), [scale]);
  const listContentStyle = useMemo(() => buildListContentStyle(scale), [scale]);
  const separatorStyle = useMemo(() => buildSeparatorStyle(scale), [scale]);

  return { theme, listContainerStyle, listContentStyle, separatorStyle };
}

export function DiscoverCreatorsScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const { listContainerStyle, listContentStyle, separatorStyle } = useScreenStyles();
  const [state, actions] = useDiscoverCreators(onContinue);
  const handleClose = useCallback(() => onBack?.(), [onBack]);

  return (
    <BottomSheet
      isVisible
      onClose={handleClose}
      {...(onBack ? { onBack } : {})}
      title="Discover creators"
      floatingFooter={<Button label="Continue" onPress={actions.handleContinue} />}
      testID="discover-creators-screen"
    >
      <OnboardingScreenTitle title="Discover creators" subtitle="Connect with visionaries and inspiring voices" />
      {state.isLoading ? (
        <View style={listContainerStyle}><CreatorRowSkeletonList /></View>
      ) : (
        <CreatorList state={state} actions={actions} containerStyle={listContainerStyle} contentStyle={listContentStyle} separatorStyle={separatorStyle} />
      )}
    </BottomSheet>
  );
}
