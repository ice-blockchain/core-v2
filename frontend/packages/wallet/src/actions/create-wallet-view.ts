import type { WalletView } from "../types";
import {
  walletViewStore,
  batchUpdate,
  getNextId,
  setWalletViews,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { notifyWalletError } from "../stores/wallet-notification-config";
import { convertWalletView } from "../converters/convert-wallet-view";

export const MAX_WALLET_VIEWS = 2;

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function validateCreateInput(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Wallet name cannot be empty");
  const current = walletViewStore.getWalletViews();
  if (current.length >= MAX_WALLET_VIEWS) throw new Error("Maximum number of wallets reached");
  return trimmedName;
}

function addOptimisticWallet(trimmedName: string): WalletView {
  const current = walletViewStore.getWalletViews();
  const walletView: WalletView = {
    id: getNextId(),
    name: trimmedName,
    balance: "$0.00",
    isMain: false,
    coinGroups: [],
    isLoading: true,
    serverId: null,
    originalItems: [],
    originalSymbolGroups: [],
  };
  batchUpdate([...current, walletView], walletView.id);
  return walletView;
}

function revertOptimisticCreate(tempId: string, previousActiveId: string): void {
  const views = walletViewStore.getWalletViews().filter((v) => v.id !== tempId);
  batchUpdate(views, previousActiveId);
}

export function createWalletView(name: string): void {
  const trimmedName = validateCreateInput(name);
  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const optimistic = addOptimisticWallet(trimmedName);

  const { client, username } = getWalletClient();
  client.createWalletView(username, { name: trimmedName, items: [], symbolGroups: [] })
    .then((created) => client.getWalletView(username, created.id).then((detail) => ({ created, detail })))
    .then(({ created, detail }) => {
      const viewData = convertWalletView(detail);
      const views = walletViewStore.getWalletViews();
      setWalletViews(views.map((v) =>
        v.id === optimistic.id
          ? {
              ...v,
              id: created.id,
              serverId: created.id,
              balance: usdFormatter.format(viewData.usdBalance),
              coinGroups: viewData.coinGroups,
              isLoading: false,
              originalItems: [],
              originalSymbolGroups: detail.symbolGroups,
            }
          : v,
      ));
    })
    .catch((error) => {
      revertOptimisticCreate(optimistic.id, previousActiveId);
      notifyWalletError("Failed to create wallet");
      console.error("Failed to create wallet view", error);
    });
}
