import { walletViewStore, setWalletViews, batchUpdate, resetWalletViewStore } from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";
import { buildWalletActionError } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import { convertWalletView } from "../converters/convert-wallet-view";
import { formatUsdBalance } from "../converters/format-usd";
import type { WalletView } from "../types";

function setAllViewsLoading(isLoading: boolean): void {
  const views = walletViewStore.getWalletViews();
  setWalletViews(views.map((view) => ({ ...view, isLoading })));
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
    balance: formatUsdBalance(viewData.usdBalance),
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
      resetWalletViewStore();
      return;
    }

    const details = await Promise.all(
      summaries.map((summary) => client.getWalletView(username, summary.id)),
    );

    const walletViews = summaries.map((summary, index) =>
      buildWalletView(details[index]!, summary, index === 0),
    );

    batchUpdate(walletViews, walletViews[0]!.id);
  } catch (error: unknown) {
    setAllViewsLoading(false);
    Logger.error("Failed to load wallet view data", {
      tag: "wallet",
      error: error instanceof Error ? error : new Error(String(error)),
      data: { username },
    });
    throw buildWalletActionError(WalletErrorCode.LOAD_FAILED);
  }
}
