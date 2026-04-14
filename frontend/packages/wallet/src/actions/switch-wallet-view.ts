import { walletViewStore, setActiveWalletViewId } from "../stores/wallet-view-store";
import { WalletErrorCode, type WalletActionResult } from "../errors";
import { walletErrorResult, walletSuccess } from "../error-messages";

export function switchWalletView(walletId: string): WalletActionResult {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) return walletErrorResult(WalletErrorCode.WALLET_NOT_FOUND);

  setActiveWalletViewId(walletId);
  return walletSuccess(undefined);
}
