import { useCallback, useState } from "react";
import { Routes, useSheetNavigation } from "@ion/navigation";

/** Encapsulates wallet screen user actions: balance toggle, sheet navigation, and snack bar visibility. */
export function useWalletActions() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isSnackBarVisible, setIsSnackBarVisible] = useState(false);
  const navigation = useSheetNavigation();

  const toggleBalance = useCallback(() => setIsBalanceVisible((p) => !p), []);
  const openSheet = useCallback(() => navigation.navigate(Routes.Sheet.WalletViewManagement), [navigation]);
  const showSnackBar = useCallback(() => setIsSnackBarVisible(true), []);
  const hideSnackBar = useCallback(() => setIsSnackBarVisible(false), []);

  return { isBalanceVisible, isSnackBarVisible, toggleBalance, openSheet, showSnackBar, hideSnackBar };
}