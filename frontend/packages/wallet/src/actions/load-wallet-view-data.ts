import { walletViewStore, setWalletViews, batchUpdate } from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { notifyWalletError } from "../stores/wallet-notification-config";
import { convertWalletView } from "../converters/convert-wallet-view";
import type { WalletView } from "../types";

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function setAllViewsLoading(isLoading: boolean): void {
  const views = walletViewStore.getWalletViews();
  setWalletViews(views.map((v) => ({ ...v, isLoading })));
}

function buildWalletView(
  detail: Parameters<typeof convertWalletView>[0],
  summary: { id: string; name: string; coins: readonly { coinId: string; walletId: string | null }[]; symbolGroups: readonly string[] },
  isMain: boolean,
): WalletView {
  const viewData = convertWalletView(detail);
  return {
    id: summary.id,
    name: summary.name,
    balance: usdFormatter.format(viewData.usdBalance),
    isMain,
    coinGroups: viewData.coinGroups,
    isLoading: false,
    serverId: summary.id,
    originalItems: [...summary.coins],
    originalSymbolGroups: [...summary.symbolGroups],
  };
}

export async function loadWalletViewData(): Promise<void> {
  const { client, username } = getWalletClient();
  setAllViewsLoading(true);
  try {
    const summaries = await client.listWalletViews(username);
    if (summaries.length === 0) {
      setAllViewsLoading(false);
      return;
    }

    const details = await Promise.all(
      summaries.map((s) => client.getWalletView(username, s.id)),
    );

    const walletViews = summaries.map((summary, index) =>
      buildWalletView(details[index]!, summary, index === 0),
    );

    batchUpdate(walletViews, walletViews[0]!.id);
  } catch (error) {
    setAllViewsLoading(false);
    notifyWalletError("Failed to load wallet data");
    console.error("Failed to load wallet view data", error);
  }
}
