export interface WalletView {
  id: string;
  name: string;
  balance: string;
  isMain: boolean;
}

export interface WalletViewStore {
  getWalletViews: () => readonly WalletView[];
  getActiveWalletViewId: () => string;
  subscribe: (listener: () => void) => () => void;
}
