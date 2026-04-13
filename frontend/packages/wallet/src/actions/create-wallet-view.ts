import type { WalletView } from "../types";
import {
  walletViewStore,
  batchUpdate,
  getNextId,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";
import { buildWalletActionError } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import type { WalletViewDetail } from "@ion/identity-client";
import { convertWalletView } from "../converters/convert-wallet-view";
import { formatUsdBalance } from "../converters/format-usd";

export const MAX_WALLET_VIEWS = 2;

function validateCreateInput(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) throw buildWalletActionError(WalletErrorCode.NAME_EMPTY);
  const current = walletViewStore.getWalletViews();
  if (current.length >= MAX_WALLET_VIEWS) {
    throw buildWalletActionError(WalletErrorCode.MAX_WALLETS_REACHED);
  }
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
  const currentActive = walletViewStore.getActiveWalletViewId();
  const views = walletViewStore.getWalletViews().filter((v) => v.id !== tempId);
  const activeId = currentActive === tempId ? previousActiveId : currentActive;
  batchUpdate(views, activeId);
}

function finalizeCreatedView(optimisticId: string, created: { id: string }, detail: WalletViewDetail): void {
  const viewData = convertWalletView(detail);
  const views = walletViewStore.getWalletViews();
  const activeId = walletViewStore.getActiveWalletViewId();
  const updatedViews = views.map((v) =>
    v.id === optimisticId
      ? {
          ...v,
          id: created.id,
          serverId: created.id,
          balance: formatUsdBalance(viewData.usdBalance),
          coinGroups: viewData.coinGroups,
          isLoading: false,
          originalItems: [],
          originalSymbolGroups: detail.symbolGroups,
        }
      : v,
  );
  const newActiveId = activeId === optimisticId ? created.id : activeId;
  batchUpdate(updatedViews, newActiveId);
}

export function createWalletView(name: string): Promise<void> {
  const trimmedName = validateCreateInput(name);
  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const optimistic = addOptimisticWallet(trimmedName);

  let clientInfo;
  try {
    clientInfo = getWalletClient();
  } catch (error) {
    revertOptimisticCreate(optimistic.id, previousActiveId);
    throw error;
  }

  const { client, username } = clientInfo;
  return client.createWalletView(username, { name: trimmedName, items: [], symbolGroups: [] })
    .then((created) => client.getWalletView(username, created.id).then((detail) => ({ created, detail })))
    .then(({ created, detail }) => finalizeCreatedView(optimistic.id, created, detail))
    .catch((error: unknown) => {
      revertOptimisticCreate(optimistic.id, previousActiveId);
      Logger.error("Failed to create wallet view", {
        tag: "wallet",
        error: error instanceof Error ? error : new Error(String(error)),
        data: { name: trimmedName },
      });
      throw buildWalletActionError(WalletErrorCode.CREATE_FAILED);
    });
}
