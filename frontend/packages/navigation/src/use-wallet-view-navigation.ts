import { useMemo } from 'react';
import { useNavigation, StackActions, type NavigationProp } from '@react-navigation/native';

import type { RootStackParamList, WalletViewSheetParamList } from './route-params';
import { Routes } from './routes';

export interface WalletViewNavigation {
  openManage: () => void;
  openCreate: () => void;
  openEdit: (walletId: string) => void;
  openDeleteConfirm: (walletId: string) => void;
  goBack: () => void;
  goToSwitcher: () => void;
  closeSheet: () => void;
}

/**
 * Must be called from a component rendered inside WalletViewSheetNavigator's
 * DynamicStackNavigator — the generic resolves `useNavigation` to the nested
 * wallet-view navigator. `closeSheet` walks up to the root navigator via getParent.
 */
export function useWalletViewNavigation(): WalletViewNavigation {
  const navigation = useNavigation<NavigationProp<WalletViewSheetParamList>>();
  return useMemo(() => ({
    openManage: () => navigation.navigate(Routes.WalletView.Manage),
    openCreate: () => navigation.navigate(Routes.WalletView.Create),
    openEdit: (walletId: string) => navigation.navigate(Routes.WalletView.Edit, { walletId }),
    openDeleteConfirm: (walletId: string) => navigation.navigate(Routes.WalletView.DeleteConfirm, { walletId }),
    goBack: () => navigation.goBack(),
    goToSwitcher: () => navigation.dispatch(StackActions.popToTop()),
    closeSheet: () => {
      const parent = navigation.getParent<NavigationProp<RootStackParamList>>();
      if (parent) parent.goBack();
    },
  }), [navigation]);
}
