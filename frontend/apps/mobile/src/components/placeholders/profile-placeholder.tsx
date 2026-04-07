import { useCallback, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, Routes } from "@ion/navigation";
import { identityClient } from "../../identity-client";

function useCurrentUser(): string | null {
  const users = useSyncExternalStore(
    identityClient.authStore.subscribe,
    identityClient.authStore.getSnapshot,
  );
  return users[0] ?? null;
}

export function ProfilePlaceholder() {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const username = useCurrentUser();

  const handleLogout = useCallback(async () => {
    if (!username) return;
    await identityClient.logout(username);
    navigation.reset({ index: 0, routes: [{ name: Routes.GetStarted }] });
  }, [username, navigation]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primaryBackground }}>
      <Text variant="headline2">{translate("mainShell:profileTab")}</Text>
      {username && (
        <Button label={translate("mainShell:logOutButton")} color="primary" height={44} onPress={handleLogout} />
      )}
    </View>
  );
}
