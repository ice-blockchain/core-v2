import type { ComponentType } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventArg } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translate } from '@ion/localization';
import { Icon, useTheme } from '@ion/ui';

import type { SettingsStackParamList } from './route-params';
import { Routes } from './routes';
import { Sheet } from './sheet-navigator';
import { useSheetNavigation } from './use-sheet-navigation';
import { SettingsHeightContext } from './use-settings-content-height';
import { SettingsCloseNavigationContext } from './use-settings-close-navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();
const HANDLE_HEIGHT = 13;

export interface SettingsScreens {
  Home: ComponentType;
  Account: ComponentType;
}

type SettingsNav = Pick<NativeStackNavigationProp<SettingsStackParamList>, 'goBack' | 'canGoBack'>;
type NavRef = React.MutableRefObject<SettingsNav | null>;
type StateEvent = EventArg<'state', false, { state: { index: number; routes: Array<{ name: string }> } }>;

const TITLE_KEYS: Record<string, string> = {
  [Routes.Settings.Home]: 'profile:settingsTitle',
  [Routes.Settings.Account]: 'profile:accountTitle',
};

function translateTitle(routeName: string): string {
  const key = TITLE_KEYS[routeName];
  return key ? translate(key) : '';
}

function useSettingsSnapPoints(heights: Record<string, number>, activeRoute: string) {
  const scale = useTheme().scale.scaleSize;
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const contentHeight = heights[activeRoute];
    if (!contentHeight) return undefined;
    const headerHeight = scale(20) + scale(24) + scale(16);
    return [contentHeight + headerHeight + scale(HANDLE_HEIGHT) + insets.bottom];
  }, [heights, activeRoute, scale, insets.bottom]);
}

function useScreenOptions() {
  const theme = useTheme();
  return useMemo(() => ({
    headerShown: false as const,
    animation: 'slide_from_right' as const,
    contentStyle: { backgroundColor: theme.colors.secondaryBackground },
  }), [theme.colors.secondaryBackground]);
}

interface ListenerCallbacks {
  setTitle: (t: string) => void;
  setActiveRoute: (r: string) => void;
  setIndex: (i: number) => void;
}

function useSettingsListeners(navRef: NavRef, callbacks: ListenerCallbacks) {
  const { setTitle, setActiveRoute, setIndex } = callbacks;
  return useCallback(({ navigation }: { navigation: SettingsNav }) => {
    navRef.current = navigation;
    return {
      state: (event: StateEvent) => {
        const navState = event.data?.state;
        const focused = navState?.routes[navState.index];
        if (focused) { setTitle(translateTitle(focused.name)); setActiveRoute(focused.name); setIndex(navState.index); }
      },
    };
  }, [navRef, setTitle, setActiveRoute, setIndex]);
}

function SettingsStack({ screens, navRef, callbacks }: { screens: SettingsScreens; navRef: NavRef; callbacks: ListenerCallbacks }) {
  const screenOptions = useScreenOptions();
  const listeners = useSettingsListeners(navRef, callbacks);
  return (
    <Stack.Navigator screenOptions={screenOptions} screenListeners={listeners}>
      <Stack.Screen name={Routes.Settings.Home} component={screens.Home} />
      <Stack.Screen name={Routes.Settings.Account} component={screens.Account} />
    </Stack.Navigator>
  );
}

function useRouteHeights() {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const reportHeight = useCallback((route: string, height: number) => {
    setHeights((prev) => (prev[route] === height ? prev : { ...prev, [route]: height }));
  }, []);
  return { heights, reportHeight };
}

function useSheetCloseHandlers(navigation: ReturnType<typeof useSheetNavigation>) {
  const closeRef = useRef<(() => void) | null>(null);
  const pendingRouteRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);
  const handleAnimateClose = useCallback(() => {
    const route = pendingRouteRef.current;
    if (!route) return;
    pendingRouteRef.current = null;
    navigatedRef.current = true;
    navigation.goBack();
    navigation.navigate(route as never);
  }, [navigation]);
  const handleClosed = useCallback(() => { if (!navigatedRef.current) { navigation.goBack(); } navigatedRef.current = false; }, [navigation]);
  const handleCloseRequest = useCallback(() => closeRef.current?.(), []);
  const closeAndNavigate = useCallback((route: string) => { pendingRouteRef.current = route; closeRef.current?.(); }, []);
  return { closeRef, handleClosed, handleCloseRequest, closeAndNavigate, handleAnimateClose };
}

export function SettingsSheetNavigator({ screens }: { screens: SettingsScreens }) {
  const navigation = useSheetNavigation();
  const navRef = useRef<SettingsNav | null>(null);
  const [title, setTitle] = useState(() => translateTitle(Routes.Settings.Home));
  const [activeRoute, setActiveRoute] = useState<string>(Routes.Settings.Home);
  const [index, setIndex] = useState(0);
  const callbacks = useMemo(() => ({ setTitle, setActiveRoute, setIndex }), []);
  const { heights, reportHeight } = useRouteHeights();
  const snapPoints = useSettingsSnapPoints(heights, activeRoute);
  const { closeRef, handleClosed, handleCloseRequest, closeAndNavigate, handleAnimateClose } = useSheetCloseHandlers(navigation);
  const handleBack = useCallback(() => { if (navRef.current?.canGoBack()) navRef.current.goBack(); }, []);
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const closeButton = useMemo(() => (
    <Pressable onPress={handleCloseRequest} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
      <Icon name="sheet-close" size={scale(24)} color={theme.colors.primaryText} />
    </Pressable>
  ), [handleCloseRequest, scale, theme.colors.primaryText]);

  return (
    <SettingsCloseNavigationContext.Provider value={closeAndNavigate}>
      <SettingsHeightContext.Provider value={reportHeight}>
        <Sheet onClose={handleClosed} onAnimateClose={handleAnimateClose} closeRef={closeRef} title={title} titleVisible headerRightAction={closeButton} onBack={index > 0 ? handleBack : undefined} snapPoints={snapPoints}>
          <SettingsStack screens={screens} navRef={navRef} callbacks={callbacks} />
        </Sheet>
      </SettingsHeightContext.Provider>
    </SettingsCloseNavigationContext.Provider>
  );
}
