import { translate } from "@ion/localization";
import type { WalletActionError, WalletActionResult } from "./errors";
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

export function buildWalletError(code: WalletErrorCode): WalletActionError {
  return { code, userMessage: translate(ERROR_KEYS[code]) };
}

export function walletErrorResult<T = void>(code: WalletErrorCode): WalletActionResult<T> {
  return { outcome: "error", error: buildWalletError(code) };
}

export function walletSuccess<T = void>(value: T): WalletActionResult<T> {
  return { outcome: "success", value };
}
