import { translate } from "@ion/localization";
import { ActionError } from "@ion/diagnostics";
import { WalletErrorCode } from "./errors";

const ERROR_KEYS: Record<WalletErrorCode, string> = {
  [WalletErrorCode.NAME_EMPTY]: "walletUi:walletNameEmptyError",
  [WalletErrorCode.WALLET_NOT_FOUND]: "walletUi:walletNotFoundError",
  [WalletErrorCode.MAX_WALLETS_REACHED]: "walletUi:maxWalletsReachedError",
  [WalletErrorCode.CANNOT_DELETE_MAIN]: "walletUi:cannotDeleteMainWalletError",
  [WalletErrorCode.CANNOT_DELETE_LAST]: "walletUi:cannotDeleteLastWalletError",
  [WalletErrorCode.CREATE_FAILED]: "walletUi:createWalletError",
  [WalletErrorCode.RENAME_FAILED]: "walletUi:renameWalletError",
  [WalletErrorCode.DELETE_FAILED]: "walletUi:deleteWalletError",
  [WalletErrorCode.LOAD_FAILED]: "walletUi:loadWalletError",
};

export function buildWalletActionError(code: WalletErrorCode): ActionError<WalletErrorCode> {
  return new ActionError(code, translate(ERROR_KEYS[code]));
}
