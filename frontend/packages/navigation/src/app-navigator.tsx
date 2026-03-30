import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';
import { Routes } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  screens: {
    Splash: ComponentType;
    GetStarted: ComponentType;
    Catalog: ComponentType;
  };
}

export function AppNavigator({ screens }: AppNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name={Routes.Splash} component={screens.Splash} />
      <Stack.Screen
        name={Routes.GetStarted}
        component={screens.GetStarted}
      />
      <Stack.Screen name={Routes.Catalog} component={screens.Catalog} />
    </Stack.Navigator>
  );
}
