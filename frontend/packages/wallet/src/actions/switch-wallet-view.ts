import { walletViewStore, setActiveWalletViewId } from "../stores/wallet-view-store";
import { WalletErrorCode } from "../errors";
import { buildWalletActionError } from "../error-messages";

export function switchWalletView(walletId: string): void {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);

  if (!wallet) {
    throw buildWalletActionError(WalletErrorCode.WALLET_NOT_FOUND);
  }

  setActiveWalletViewId(walletId);
}
