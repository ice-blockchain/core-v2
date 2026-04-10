import { useCallback, useMemo } from "react";
import { FlatList, View } from "react-native";
import { useTheme } from "@ion/ui";
import type { CoinsGroup } from "@ion/wallet";
import { CoinListItem } from "./CoinListItem";

interface CoinListProps {
  readonly coinGroups: readonly CoinsGroup[];
  readonly searchQuery: string;
  readonly isBalanceVisible: boolean;
}

function matchesSearch(group: CoinsGroup, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    group.name.toLowerCase().includes(lowerQuery) ||
    group.abbreviation.toLowerCase().includes(lowerQuery)
  );
}

function extractKey(item: CoinsGroup): string {
  return item.symbolGroup;
}

function useCoinListLayout() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const separatorHeight = theme.spacing.md;
  const itemHeight = scale(12) * 2 + scale(36);

  const separatorStyle = useMemo(() => ({ height: separatorHeight }), [separatorHeight]);
  const Separator = useMemo(() => {
    return function ItemSeparator() { return <View style={separatorStyle} />; };
  }, [separatorStyle]);
  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: itemHeight, offset: (itemHeight + separatorHeight) * index, index,
  }), [itemHeight, separatorHeight]);

  return { Separator, getItemLayout };
}

export function CoinList({ coinGroups, searchQuery, isBalanceVisible }: CoinListProps) {
  const { Separator, getItemLayout } = useCoinListLayout();

  const renderCoinItem = useCallback(({ item }: { item: CoinsGroup }) => {
    return <CoinListItem group={item} isBalanceVisible={isBalanceVisible} />;
  }, [isBalanceVisible]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return coinGroups;
    return coinGroups.filter((group) => matchesSearch(group, searchQuery));
  }, [coinGroups, searchQuery]);

  return (
    <FlatList
      data={filteredGroups} keyExtractor={extractKey} renderItem={renderCoinItem}
      getItemLayout={getItemLayout} ItemSeparatorComponent={Separator}
      ListFooterComponent={Separator} scrollEnabled={false} removeClippedSubviews
    />
  );
}
