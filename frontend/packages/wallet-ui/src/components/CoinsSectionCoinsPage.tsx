import { View } from "react-native";
import type { WalletView } from "@ion/wallet";
import { CoinList } from "./CoinList";
import { CoinsSectionSkeleton } from "./CoinsSectionSkeleton";
import { ManageCoinsButton } from "./ManageCoinsButton";
import { EmptyCoinsState } from "./EmptyCoinsState";

interface CoinsSectionCoinsPageProps {
  activeView: WalletView;
  searchQuery: string;
  isBalanceVisible: boolean;
  styles: { page: object; emptyImage: object; emptyState: object };
  textColor: string;
}

export function CoinsSectionCoinsPage({ activeView, searchQuery, isBalanceVisible, styles, textColor }: CoinsSectionCoinsPageProps) {
  if (activeView.isLoading) {
    return (
      <View style={styles.page}>
        <CoinsSectionSkeleton />
      </View>
    );
  }
  if (activeView.coinGroups.length > 0) {
    return (
      <View style={styles.page}>
        <CoinList coinGroups={activeView.coinGroups} searchQuery={searchQuery} isBalanceVisible={isBalanceVisible} />
        <ManageCoinsButton />
      </View>
    );
  }
  return (
    <View style={styles.page}>
      <EmptyCoinsState imageStyle={styles.emptyImage} stateStyle={styles.emptyState} textColor={textColor} />
      <ManageCoinsButton />
    </View>
  );
}
