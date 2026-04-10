import { useEffect } from "react";
import { setWalletErrorNotifier } from "@ion/wallet";

export function useWalletErrorNotifier() {
  useEffect(() => {
    setWalletErrorNotifier((message: string) => {
      console.warn("[wallet]", message);
    });
  }, []);
}
