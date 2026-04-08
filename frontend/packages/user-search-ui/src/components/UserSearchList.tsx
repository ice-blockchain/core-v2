import { useCallback, useMemo } from "react";
import { FlatList, Image, View } from "react-native";
import type { FlatListProps } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { SearchableUser } from "@ion/user-search";
import { ActiveSearchBar } from "./ActiveSearchBar";
import { UserSearchRow } from "./UserSearchRow";
import { UserSearchSkeleton } from "./UserSearchSkeleton";
import { useUserSearchList } from "./user-search-list-hooks";
import type { UserSearchListState } from "./user-search-list-hooks";
import { emptySearchImage, searchHintImage, emptySearchDarkImage, searchHintDarkImage } from "./search-images";
import {
  buildContainerStyle,
  buildContentStyle,
  buildSearchBarContainerStyle,
  buildEmptyStateStyle,
} from "./user-search-list-styles";

type FlatListComponent = typeof FlatList | React.ComponentType<FlatListProps<SearchableUser>>;

export interface UserSearchListProps {
  showSearchField?: boolean;
  onSelectUser?: ((user: SearchableUser) => void) | undefined;
  listComponent?: FlatListComponent | undefined;
  testID?: string;
}

function EmptyState({ scale, tertiaryText, translationKey, image }: {
  scale: (n: number) => number;
  tertiaryText: string;
  translationKey: string;
  image: typeof emptySearchImage;
}) {
  const containerStyle = useMemo(() => buildEmptyStateStyle(scale), [scale]);
  const imageStyle = useMemo(() => ({ width: scale(48), height: scale(48) }), [scale]);
  return (
    <View style={containerStyle}>
      <Image source={image} style={imageStyle} />
      <Text variant="caption2" color={tertiaryText}>{translate(translationKey)}</Text>
    </View>
  );
}

function useListStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;
  return {
    containerStyle: useMemo(() => buildContainerStyle(colors.secondaryBackground), [colors.secondaryBackground]),
    contentStyle: useMemo(() => buildContentStyle(scale), [scale]),
    searchContainerStyle: useMemo(() => buildSearchBarContainerStyle(scale), [scale]),
    scale,
    colors,
    isDark: theme.colorMode === "dark",
  };
}

function UserResultList({ state, renderItem, keyExtractor, onEndReached, contentStyle, List }: {
  state: UserSearchListState;
  renderItem: ({ item }: { item: SearchableUser }) => React.JSX.Element;
  keyExtractor: (item: SearchableUser) => string;
  onEndReached: () => void;
  contentStyle: ReturnType<typeof buildContentStyle>;
  List: FlatListComponent;
}) {
  return (
    <List
      data={state.users}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentStyle}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      testID="user-search-flatlist"
    />
  );
}

function ListContent({ state, scale, colors, isDark, renderItem, keyExtractor, onEndReached, contentStyle, List }: {
  state: UserSearchListState;
  scale: (n: number) => number;
  colors: { tertiaryText: string };
  isDark: boolean;
  renderItem: ({ item }: { item: SearchableUser }) => React.JSX.Element;
  keyExtractor: (item: SearchableUser) => string;
  onEndReached: () => void;
  contentStyle: ReturnType<typeof buildContentStyle>;
  List: FlatListComponent;
}) {
  const hintImage = isDark ? searchHintDarkImage : searchHintImage;
  const emptyImage = isDark ? emptySearchDarkImage : emptySearchImage;
  if (state.query.length === 0 && state.isFocused) return <EmptyState scale={scale} tertiaryText={colors.tertiaryText} translationKey="userSearch:searchHint" image={hintImage} />;
  if (state.isLoading) return <UserSearchSkeleton />;
  if (state.users.length === 0 && state.query.length > 0) return <EmptyState scale={scale} tertiaryText={colors.tertiaryText} translationKey="userSearch:noResultsFound" image={emptyImage} />;
  return <UserResultList state={state} renderItem={renderItem} keyExtractor={keyExtractor} onEndReached={onEndReached} contentStyle={contentStyle} List={List} />;
}

export function UserSearchList({ showSearchField = true, onSelectUser, listComponent, testID }: UserSearchListProps) {
  const { containerStyle, contentStyle, searchContainerStyle, scale, colors, isDark } = useListStyles();
  const [state, actions] = useUserSearchList();

  const renderItem = useCallback(
    ({ item }: { item: SearchableUser }) => (
      <UserSearchRow user={item} onPress={onSelectUser} testID={`user-row-${item.id}`} />
    ),
    [onSelectUser],
  );
  const keyExtractor = useCallback((item: SearchableUser) => item.id, []);
  const isSearchLoading = state.isLoading && state.query.length > 0;

  return (
    <View style={containerStyle} testID={testID}>
      {showSearchField && (
        <View style={searchContainerStyle}>
          <ActiveSearchBar value={state.query} isFocused={state.isFocused} onChangeText={actions.handleQueryChange} isLoading={isSearchLoading} onCancel={actions.handleCancel} onFocus={actions.handleFocus} onBlur={actions.handleBlur} testID="user-search-input" />
        </View>
      )}
      <ListContent state={state} scale={scale} colors={colors} isDark={isDark} renderItem={renderItem} keyExtractor={keyExtractor} onEndReached={actions.handleLoadMore} contentStyle={contentStyle} List={listComponent ?? FlatList} />
    </View>
  );
}
