import { useCallback, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Icon, Text, TextField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useWalletViews, renameWalletView } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import { showWalletError } from "../../show-wallet-error";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import type { WalletViewSheetParamList } from "@ion/navigation";

type EditRoute = RouteProp<WalletViewSheetParamList, "WalletViewEdit">;

export function EditWalletViewScreen() {
  const { walletId } = useRoute<EditRoute>().params;
  const walletViews = useWalletViews();
  const wallet = walletViews.find((w) => w.id === walletId);
  if (!wallet) return null;

  return <EditWalletViewForm wallet={wallet} />;
}

interface FormProps {
  wallet: { id: string; name: string; isMain: boolean };
}

function useRenameHandler(walletId: string, name: string) {
  const walletViewNav = useWalletViewNavigation();
  return useCallback(() => {
    try {
      renameWalletView(walletId, name).catch(showWalletError);
      walletViewNav.goBack();
    } catch (error) {
      showWalletError(error);
    }
  }, [walletId, name, walletViewNav]);
}

function EditWalletViewForm({ wallet }: FormProps) {
  const theme = useTheme();
  const walletViewNav = useWalletViewNavigation();
  const [name, setName] = useState(wallet.name);
  const [isFocused, setIsFocused] = useState(false);
  const canSave = name.trim() !== wallet.name && name.trim().length > 0;
  const handleSave = useRenameHandler(wallet.id, name);
  const containerStyle = useMemo(
    () => ({ gap: theme.spacing.lg, padding: theme.spacing.lg }),
    [theme.spacing.lg],
  );
  const handleDeletePress = useCallback(
    () => walletViewNav.openDeleteConfirm(wallet.id),
    [walletViewNav, wallet.id],
  );

  return (
    <View style={containerStyle}>
      <TextField
        label={translate("walletUi:walletNameLabel")}
        value={name}
        onChangeText={setName}
        isClearable
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isFocused && <Button label={translate("walletUi:saveButton")} onPress={handleSave} isDisabled={!canSave} />}
      {!wallet.isMain && !isFocused && <DeleteWalletViewButton onPress={handleDeletePress} />}
    </View>
  );
}

function DeleteWalletViewButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const buttonStyle = useMemo(() => buildDeleteButtonStyle(theme), [theme]);

  return (
    <TouchableOpacity style={[styles.deleteButton, buttonStyle]} onPress={onPress} accessibilityRole="button">
      <Icon name="block-delete" size={theme.scale.scaleSize(24)} color={theme.colors.onPrimaryAccent} />
      <Text variant="body" color={theme.colors.onPrimaryAccent}>{translate("walletUi:deleteWalletButton")}</Text>
    </TouchableOpacity>
  );
}

function buildDeleteButtonStyle(theme: ReturnType<typeof useTheme>) {
  return {
    borderRadius: theme.radii.large,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.attentionRed,
  };
}

const styles = StyleSheet.create({
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
