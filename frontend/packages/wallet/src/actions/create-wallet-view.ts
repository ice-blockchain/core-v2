import type { WalletView } from "../types";
import {
  walletViewStore,
  batchUpdate,
  getNextId,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode, type WalletActionResult } from "../errors";
import { walletErrorResult, walletSuccess } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import type { WalletViewDetail } from "@ion/identity-client";
import { convertWalletView } from "../converters/convert-wallet-view";
import { formatUsdBalance } from "../converters/format-usd";

export const MAX_WALLET_VIEWS = 2;

function validateCreateInput(name: string): WalletActionResult<string> {
  const trimmedName = name.trim();
  if (!trimmedName) return walletErrorResult(WalletErrorCode.NAME_EMPTY);
  const current = walletViewStore.getWalletViews();
  if (current.length >= MAX_WALLET_VIEWS) {
    return walletErrorResult(WalletErrorCode.MAX_WALLETS_REACHED);
  }
  return walletSuccess(trimmedName);
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

interface CreateFailure {
  tempId: string;
  previousActiveId: string;
  trimmedName: string;
  error: unknown;
}

function handleCreateFailure({ tempId, previousActiveId, trimmedName, error }: CreateFailure): WalletActionResult {
  revertOptimisticCreate(tempId, previousActiveId);
  Logger.error("Failed to create wallet view", {
    tag: "wallet",
    error: error instanceof Error ? error : new Error(String(error)),
    data: { name: trimmedName },
  });
  return walletErrorResult(WalletErrorCode.CREATE_FAILED);
}

export async function createWalletView(name: string): Promise<WalletActionResult> {
  const validation = validateCreateInput(name);
  if (validation.outcome === "error") return validation;
  const trimmedName = validation.value;

  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const optimistic = addOptimisticWallet(trimmedName);

  try {
    const { client, username } = getWalletClient();
    const created = await client.createWalletView(username, { name: trimmedName, items: [], symbolGroups: [] });
    const detail = await client.getWalletView(username, created.id);
    finalizeCreatedView(optimistic.id, created, detail);
    return walletSuccess(undefined);
  } catch (error) {
    return handleCreateFailure({ tempId: optimistic.id, previousActiveId, trimmedName, error });
  }
}
