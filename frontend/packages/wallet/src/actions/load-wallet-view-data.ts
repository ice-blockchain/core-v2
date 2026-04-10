import type { IdentityClient } from "@ion/identity-client";
import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { convertWalletView } from "../converters/convert-wallet-view";
import type { CoinsGroup } from "../types";

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function setLoadingState(isLoading: boolean): void {
  const views = walletViewStore.getWalletViews();
  const activeId = walletViewStore.getActiveWalletViewId();
  setWalletViews(
    views.map((v) => (v.id === activeId ? { ...v, isLoading } : v)),
  );
}

interface WalletUpdateData {
  balance: string;
  coinGroups: readonly CoinsGroup[];
}

function updateWithWalletData(data: WalletUpdateData): void {
  const views = walletViewStore.getWalletViews();
  const activeId = walletViewStore.getActiveWalletViewId();
  setWalletViews(
    views.map((v) =>
      v.id === activeId
        ? { ...v, balance: data.balance, coinGroups: data.coinGroups, isLoading: false }
        : v,
    ),
  );
}

export async function loadWalletViewData(
  identityClient: IdentityClient,
  username: string,
): Promise<void> {
  setLoadingState(true);
  try {
    const summaries = await identityClient.listWalletViews(username);
    if (summaries.length === 0) {
      setLoadingState(false);
      return;
    }

    const detail = await identityClient.getWalletView(username, summaries[0]!.id);
    const viewData = convertWalletView(detail);
    updateWithWalletData({
      balance: usdFormatter.format(viewData.usdBalance),
      coinGroups: viewData.coinGroups,
    });
  } catch (error) {
    setLoadingState(false);
    console.error("Failed to load wallet view data", error);
  }
}
