export enum WalletErrorCode {
  NAME_EMPTY = "NAME_EMPTY",
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  MAX_WALLETS_REACHED = "MAX_WALLETS_REACHED",
  CANNOT_DELETE_MAIN = "CANNOT_DELETE_MAIN",
  CANNOT_DELETE_LAST = "CANNOT_DELETE_LAST",
  CREATE_FAILED = "CREATE_FAILED",
  RENAME_FAILED = "RENAME_FAILED",
  DELETE_FAILED = "DELETE_FAILED",
  LOAD_FAILED = "LOAD_FAILED",
}

export class ActionError extends Error {
  code: string;
  userMessage: string;

  constructor(code: string, userMessage: string) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.name = "ActionError";
  }
}
