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
    return [contentHeight + headerHeight + HANDLE_HEIGHT + insets.bottom];
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

function useSettingsListeners(navRef: NavRef, setTitle: (t: string) => void, setActiveRoute: (r: string) => void) {
  return useCallback(({ navigation }: { navigation: SettingsNav }) => {
    navRef.current = navigation;
    return {
      state: (event: StateEvent) => {
        const navState = event.data?.state;
        const focused = navState?.routes[navState.index];
        if (focused) { setTitle(translateTitle(focused.name)); setActiveRoute(focused.name); }
      },
    };
  }, [navRef, setTitle, setActiveRoute]);
}

function SettingsStack({ screens, navRef, setTitle, setActiveRoute }: { screens: SettingsScreens; navRef: NavRef; setTitle: (t: string) => void; setActiveRoute: (r: string) => void }) {
  const screenOptions = useScreenOptions();
  const listeners = useSettingsListeners(navRef, setTitle, setActiveRoute);
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

export function SettingsSheetNavigator({ screens }: { screens: SettingsScreens }) {
  const navigation = useSheetNavigation();
  const navRef = useRef<SettingsNav | null>(null);
  const [title, setTitle] = useState(() => translateTitle(Routes.Settings.Home));
  const [activeRoute, setActiveRoute] = useState<string>(Routes.Settings.Home);
  const { heights, reportHeight } = useRouteHeights();
  const snapPoints = useSettingsSnapPoints(heights, activeRoute);
  const handleClose = useCallback(() => navigation.goBack(), [navigation]);
  const handleBack = useCallback(() => { if (navRef.current?.canGoBack()) navRef.current.goBack(); }, []);
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const closeButton = useMemo(() => (
    <Pressable onPress={handleClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
      <Icon name="sheet-close" size={scale(24)} color={theme.colors.primaryText} />
    </Pressable>
  ), [handleClose, scale, theme.colors.primaryText]);

  return (
    <SettingsHeightContext.Provider value={reportHeight}>
      <Sheet onClose={handleClose} title={title} titleVisible headerRightAction={closeButton} onBack={handleBack} snapPoints={snapPoints}>
        <SettingsStack screens={screens} navRef={navRef} setTitle={setTitle} setActiveRoute={setActiveRoute} />
      </Sheet>
    </SettingsHeightContext.Provider>
  );
}
