import { useCallback, useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { BottomSheet, Button, useTheme } from "@ion/ui";
import type { OnboardingScreenProps } from "../types";
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

  const listContainerStyle = useMemo(() => buildListContainerStyle(scale), [scale]);
  const listContentStyle = useMemo(() => buildListContentStyle(scale), [scale]);

  return { listContainerStyle, listContentStyle };
}

export function DiscoverCreatorsScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const { listContainerStyle, listContentStyle } = useScreenStyles();
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
        <View style={listContainerStyle}>
          <CreatorList state={state} actions={actions} contentStyle={listContentStyle} />
        </View>
      )}
    </BottomSheet>
  );
}
