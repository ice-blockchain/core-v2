import { useEffect } from "react";
import { setWalletErrorNotifier, clearWalletErrorNotifier } from "@ion/wallet";

export function useWalletErrorNotifier() {
  useEffect(() => {
    setWalletErrorNotifier((message: string) => {
      console.warn("[wallet]", message);
    });
    return () => { clearWalletErrorNotifier(); };
  }, []);
}
