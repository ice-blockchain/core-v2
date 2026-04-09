import type { ComponentType } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { EventArg, NavigationProp } from '@react-navigation/native';
import { translate } from '@ion/localization';

import type { WalletViewSheetParamList } from './route-params';
import { Routes } from './routes';
import { DynamicSheet } from './DynamicSheet';
import { useSheetNavigation } from './use-sheet-navigation';
import { createDynamicStackNavigator } from './dynamic-stack-navigator';

const WalletViewNav = createDynamicStackNavigator();

export interface WalletViewScreens {
  Switcher: ComponentType;
  Manage: ComponentType;
  Create: ComponentType;
  Edit: ComponentType;
  DeleteConfirm: ComponentType;
}

interface SheetState {
  title: string;
  showClose: boolean;
  showBack: boolean;
}

const TITLE_KEYS: Record<string, string> = {
  [Routes.WalletView.Switcher]: 'walletUi:walletsTitle',
  [Routes.WalletView.Manage]: 'walletUi:manageWalletsTitle',
  [Routes.WalletView.Create]: 'walletUi:createWalletTitle',
  [Routes.WalletView.Edit]: 'walletUi:editWalletTitle',
};

function buildSheetState(routeName: string, hasHistory: boolean): SheetState {
  if (routeName === Routes.WalletView.DeleteConfirm) {
    return { title: '', showClose: false, showBack: false };
  }
  const titleKey = TITLE_KEYS[routeName] ?? '';
  return {
    title: titleKey ? translate(titleKey) : '',
    showClose: true,
    showBack: hasHistory,
  };
}

type WalletViewNavigation = Pick<NavigationProp<WalletViewSheetParamList>, 'goBack' | 'canGoBack'>;
type WalletViewNavRef = React.MutableRefObject<WalletViewNavigation | null>;
type StateEvent = EventArg<'state', false, { state: { index: number; routes: ReadonlyArray<{ name: string }> } }>;

function useWalletViewScreenListeners(navRef: WalletViewNavRef, setState: (s: SheetState) => void) {
  return useCallback(({ navigation }: { navigation: WalletViewNavigation }) => {
    navRef.current = navigation;
    return {
      state: (event: StateEvent) => {
        const navState = event.data?.state;
        const focusedRoute = navState?.routes[navState.index];
        if (!focusedRoute) return;
        setState(buildSheetState(focusedRoute.name, navState.index > 0));
      },
    };
  }, [navRef, setState]);
}

function WalletViewStack({ screens, screenListeners }: { screens: WalletViewScreens; screenListeners: ReturnType<typeof useWalletViewScreenListeners> }) {
  return (
    <WalletViewNav.Navigator initialRouteName={Routes.WalletView.Switcher} screenListeners={screenListeners}>
      <WalletViewNav.Screen name={Routes.WalletView.Switcher} component={screens.Switcher} />
      <WalletViewNav.Screen name={Routes.WalletView.Manage} component={screens.Manage} />
      <WalletViewNav.Screen name={Routes.WalletView.Create} component={screens.Create} />
      <WalletViewNav.Screen name={Routes.WalletView.Edit} component={screens.Edit} />
      <WalletViewNav.Screen name={Routes.WalletView.DeleteConfirm} component={screens.DeleteConfirm} />
    </WalletViewNav.Navigator>
  );
}

export function WalletViewSheetNavigator({ screens }: { screens: WalletViewScreens }) {
  const rootNav = useSheetNavigation();
  const walletViewNavRef = useRef<WalletViewNavigation | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>(() => buildSheetState(Routes.WalletView.Switcher, false));
  const screenListeners = useWalletViewScreenListeners(walletViewNavRef, setSheetState);

  const handleClose = useCallback(() => rootNav.goBack(), [rootNav]);
  const handleBack = useCallback(() => {
    const nav = walletViewNavRef.current;
    if (nav?.canGoBack()) nav.goBack();
  }, []);
  const isDeleteConfirm = !sheetState.showClose && !sheetState.title;

  const backProps = sheetState.showBack ? { onBack: handleBack } : {};

  return (
    <DynamicSheet
      title={sheetState.title}
      showClose={sheetState.showClose}
      {...backProps}
      isDismissable={!isDeleteConfirm}
      onDismiss={handleClose}
    >
      <WalletViewStack screens={screens} screenListeners={screenListeners} />
    </DynamicSheet>
  );
}
